const crypto = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError, onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

initializeApp();
const db = getFirestore();
const mpTestToken = defineSecret('MERCADO_PAGO_TEST_ACCESS_TOKEN');
const mpWebhookSecret = defineSecret('MERCADO_PAGO_WEBHOOK_SECRET');
const shippingToken = defineSecret('MELHOR_ENVIO_SANDBOX_TOKEN');

function requireRole(context, roles) {
  if (!context.auth) throw new HttpsError('unauthenticated', 'Entre na sua conta.');
  if (!roles.includes(context.auth.token.role)) throw new HttpsError('permission-denied', 'Acesso não autorizado.');
  return context.auth.uid;
}
function assertString(v, name, max=160) {
  if (typeof v !== 'string' || v.trim().length < 1 || v.length > max) throw new HttpsError('invalid-argument', `${name} inválido.`);
  return v.trim();
}
function assertShippingConfig() {
  const from = process.env.MELHOR_ENVIO_FROM_POSTAL_CODE?.replace(/\D/g, '');
  const userAgent = process.env.MELHOR_ENVIO_USER_AGENT;
  if (!from || !userAgent || !userAgent.includes('@')) throw new HttpsError('failed-precondition', 'Configure CEP de origem e User-Agent de suporte do Melhor Envio.');
  return {from, userAgent};
}
async function calculateShipping(items, postalCode, token) {
  const {from, userAgent} = assertShippingConfig();
  const to = assertString(postalCode, 'CEP', 20).replace(/\D/g, '');
  if (!/^\d{8}$/.test(to)) throw new HttpsError('invalid-argument', 'Informe um CEP brasileiro com 8 dígitos.');
  if (!Array.isArray(items) || items.length < 1 || items.length > 30) throw new HttpsError('invalid-argument', 'Carrinho inválido.');
  const products=[];
  for (const item of items) {
    if (typeof item.productId !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) throw new HttpsError('invalid-argument', 'Item inválido.');
    const snap=await db.doc(`products/${item.productId}`).get();
    if (!snap.exists || snap.get('active') !== true) throw new HttpsError('failed-precondition', 'Produto indisponível.');
    const p=snap.data(), box=p.shippingPackage;
    if (!box || !['width','height','length','weight'].every(k=>Number.isFinite(box[k])&&box[k]>0)) throw new HttpsError('failed-precondition', `Faltam dimensões e peso de envio em ${p.title||snap.id}.`);
    products.push({id:snap.id,width:box.width,height:box.height,length:box.length,weight:box.weight,insurance_value:Number(p.priceCents||0)/100,quantity:item.quantity});
  }
  const response=await fetch('https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate',{method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/json','Content-Type':'application/json','User-Agent':userAgent},body:JSON.stringify({from:{postal_code:from},to:{postal_code:to},products})});
  if(!response.ok){logger.error('Melhor Envio quote failed',{status:response.status});throw new HttpsError('unavailable','O cálculo de frete não está disponível agora.');}
  const quotes=await response.json();
  return Array.isArray(quotes)?quotes.filter(q=>q.id&&!q.error&&Number.isFinite(Number(q.price))).map(q=>({serviceId:String(q.id),company:q.company?.name||'',name:q.name||'',priceCents:Math.round(Number(q.price)*100),deliveryDays:Number(q.delivery_time)||null})):[];
}

exports.quoteShipping = onCall({secrets:[shippingToken],enforceAppCheck:true},async(req)=>{
  if(!req.auth) throw new HttpsError('unauthenticated','Entre na sua conta.');
  return {quotes:await calculateShipping(req.data?.items,req.data?.postalCode,shippingToken.value())};
});

// Uses only the sandbox secret and sandbox_init_point: this endpoint cannot create a live payment.
exports.createCheckout = onCall({secrets:[mpTestToken,shippingToken],enforceAppCheck:true},async(req)=>{
  if(!req.auth) throw new HttpsError('unauthenticated','Entre para finalizar.');
  const items=req.data?.items, address=req.data?.shippingAddress;
  if(!Array.isArray(items)||items.length<1||items.length>30) throw new HttpsError('invalid-argument','Carrinho inválido.');
  const idempotencyKey=assertString(req.data?.idempotencyKey,'Chave de tentativa',80);
  if(!/^[a-zA-Z0-9_-]+$/.test(idempotencyKey)) throw new HttpsError('invalid-argument','Chave de tentativa inválida.');
  const required=['firstName','lastName','email','street','city','state','postalCode'];
  if(!address||required.some(k=>typeof address[k]!=='string'||!address[k].trim()||address[k].length>180)) throw new HttpsError('invalid-argument','Endereço de entrega incompleto.');
  const lines=[];let subtotalCents=0;
  for(const item of items){
    if(typeof item.productId!=='string'||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>10) throw new HttpsError('invalid-argument','Item inválido.');
    const p=await db.doc(`products/${item.productId}`).get();
    if(!p.exists||p.get('active')!==true) throw new HttpsError('failed-precondition','Produto indisponível.');
    const d=p.data();if(!Number.isInteger(d.priceCents)||d.priceCents<1) throw new HttpsError('failed-precondition','Preço do produto inválido.');
    lines.push({productId:p.id,title:d.title,quantity:item.quantity,unitPriceCents:d.priceCents,size:typeof item.size==='string'?item.size.slice(0,8):'M'});subtotalCents+=d.priceCents*item.quantity;
  }
  const quotes=await calculateShipping(items,address.postalCode,shippingToken.value());
  const selected=quotes.find(q=>q.serviceId===String(req.data?.shippingServiceId));
  if(!selected) throw new HttpsError('failed-precondition','Escolha uma opção de frete válida.');
  const storeUrl=process.env.STORE_PUBLIC_URL?.replace(/\/$/,'');const webhookUrl=process.env.MERCADO_PAGO_WEBHOOK_URL;
  if(!storeUrl||(!storeUrl.startsWith('https://')&&!process.env.FUNCTIONS_EMULATOR)||!webhookUrl||!webhookUrl.startsWith('https://')) throw new HttpsError('failed-precondition','Configure as URLs públicas HTTPS antes de ativar o checkout sandbox.');
  const publicStore=new URL(storeUrl);
  if(publicStore.hostname==='site-proj.github.io' && publicStore.pathname.replace(/\/$/,'')!=='/sene-supply-co') throw new HttpsError('failed-precondition','A URL p�blica deve permanecer em /sene-supply-co/.');
  const token=mpTestToken.value();if(!token)throw new HttpsError('failed-precondition','Cadastre as credenciais de teste do Mercado Pago.');
  const orderId=crypto.createHash('sha256').update(`${req.auth.uid}:${idempotencyKey}`).digest('hex').slice(0,40), ref=db.doc(`orders/${orderId}`);
  const previous=await ref.get();if(previous.exists&&previous.get('payment.sandboxCheckoutUrl'))return{orderId,sandboxCheckoutUrl:previous.get('payment.sandboxCheckoutUrl'),checkoutEnabled:true};
  await ref.set({customerUid:req.auth.uid,customerEmail:address.email.trim(),shippingAddress:{firstName:address.firstName.trim(),lastName:address.lastName.trim(),street:address.street.trim(),city:address.city.trim(),state:address.state.trim(),postalCode:address.postalCode.replace(/\D/g,''),country:'BR'},items:lines,totalCents:subtotalCents+selected.priceCents,currency:'BRL',status:'awaiting_payment',payment:{provider:'mercado_pago',mode:'sandbox',status:'pending'},production:{status:'not_started'},shipping:{status:'not_started',quote:{serviceId:selected.serviceId,company:selected.company,name:selected.name,priceCents:selected.priceCents,deliveryDays:selected.deliveryDays}},createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
  const preference={external_reference:orderId,items:[...lines.map(i=>({id:i.productId,title:i.title,quantity:i.quantity,currency_id:'BRL',unit_price:i.unitPriceCents/100})),{id:'shipping',title:`Frete ${selected.company} ${selected.name}`,quantity:1,currency_id:'BRL',unit_price:selected.priceCents/100}],back_urls:{success:`${storeUrl}/?page=checkout&payment=return`,pending:`${storeUrl}/?page=checkout&payment=return`,failure:`${storeUrl}/?page=checkout&payment=return`},notification_url:webhookUrl,metadata:{order_id:orderId},statement_descriptor:'SENE SUPPLY CO.'};
  const mpResponse=await fetch('https://api.mercadopago.com/checkout/preferences',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Idempotency-Key':orderId},body:JSON.stringify(preference)});
  const mpBody=await mpResponse.json().catch(()=>({}));
  if(!mpResponse.ok||!mpBody.sandbox_init_point){logger.error('Sandbox preference creation failed',{status:mpResponse.status,orderId});await ref.update({status:'checkout_error',updatedAt:FieldValue.serverTimestamp()});throw new HttpsError('unavailable','Não foi possível abrir o checkout de teste.');}
  await ref.update({'payment.preferenceId':String(mpBody.id),'payment.sandboxCheckoutUrl':mpBody.sandbox_init_point,updatedAt:FieldValue.serverTimestamp()});
  return{orderId,sandboxCheckoutUrl:mpBody.sandbox_init_point,checkoutEnabled:true};
});

function validMpSignature(signature,requestId,dataId,secret){
  if(!signature||!requestId||!dataId)return false;
  const parts=Object.fromEntries(signature.split(',').map(p=>p.trim().split('=')));
  if(!parts.ts||!parts.v1)return false;
  const manifest=`id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected=crypto.createHmac('sha256',secret).update(manifest).digest('hex');
  const a=Buffer.from(expected,'hex'),b=Buffer.from(parts.v1,'hex');
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
exports.mercadoPagoWebhook=onRequest({secrets:[mpTestToken,mpWebhookSecret]},async(req,res)=>{
  if(req.method!=='POST'){res.sendStatus(405);return;}
  const dataId=String(req.query['data.id']||req.body?.data?.id||'');
  if(!validMpSignature(req.get('x-signature'),req.get('x-request-id'),dataId,mpWebhookSecret.value())){res.sendStatus(401);return;}
  if(req.body?.type!=='payment'){res.sendStatus(200);return;}
  try{
    const paymentResponse=await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`,{headers:{Authorization:`Bearer ${mpTestToken.value()}`}});
    if(!paymentResponse.ok){res.sendStatus(503);return;}
    const payment=await paymentResponse.json();
    if(payment.live_mode!==false){res.sendStatus(403);return;}
    const orderId=String(payment.external_reference||'');if(!/^[a-f0-9]{40}$/.test(orderId)){res.sendStatus(200);return;}
    const ref=db.doc(`orders/${orderId}`),event=ref.collection('events').doc();
    await db.runTransaction(async tx=>{const order=await tx.get(ref);if(!order.exists||order.get('payment.mode')!=='sandbox')return;if(order.get('payment.status')==='approved')return;
      if(payment.status==='approved'&&payment.currency_id==='BRL'&&Math.round(Number(payment.transaction_amount)*100)===order.get('totalCents')){
        tx.update(ref,{status:'paid','payment.status':'approved','payment.paymentId':String(payment.id),paidAt:FieldValue.serverTimestamp(),'production.status':'queued',updatedAt:FieldValue.serverTimestamp()});
        tx.create(event,{type:'payment_approved_sandbox',actor:'mercado_pago_webhook',paymentId:String(payment.id),createdAt:FieldValue.serverTimestamp()});
      }
    });res.sendStatus(200);
  }catch(error){logger.error('Mercado Pago webhook processing failed',{message:error.message});res.sendStatus(503)}
});

exports.assignOrderRole=onCall({enforceAppCheck:true},async(req)=>{const actor=requireRole(req,['owner']);const {uid,role}=req.data||{};if(typeof uid!=='string'||!['owner','printer','customer'].includes(role))throw new HttpsError('invalid-argument','Papel inválido.');const {getAuth}=require('firebase-admin/auth');await getAuth().setCustomUserClaims(uid,{role});await db.collection('auditLog').add({type:'role_assigned',actorUid:actor,targetUid:uid,role,at:FieldValue.serverTimestamp()});return{ok:true}});
exports.updateProductionStatus=onCall({enforceAppCheck:true},async(req)=>{const uid=requireRole(req,['printer','owner']);const {orderId,status,note=''}=req.data||{};const transition={queued:'in_production',in_production:'ready_for_owner',ready_for_owner:'delivered_to_owner'};if(transition[req.data?.currentStatus]!==status||typeof note!=='string'||note.length>500)throw new HttpsError('invalid-argument','Transição inválida.');const ref=db.doc(`orders/${orderId}`),event=ref.collection('events').doc();await db.runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists||s.get('payment.status')!=='approved'||s.get('production.status')!==req.data.currentStatus)throw new HttpsError('failed-precondition','Estado do pedido mudou ou ainda não houve pagamento confirmado.');tx.update(ref,{'production.status':status,updatedAt:FieldValue.serverTimestamp()});tx.create(event,{type:'production_'+status,actorUid:uid,note,createdAt:FieldValue.serverTimestamp()})});return{ok:true}});
exports.ownerDispatch=onCall({enforceAppCheck:true},async(req)=>{const uid=requireRole(req,['owner']);const {orderId,trackingCode}=req.data||{};if(typeof trackingCode!=='string'||trackingCode.trim().length<4||trackingCode.length>100)throw new HttpsError('invalid-argument','Código de rastreio inválido.');const ref=db.doc(`orders/${orderId}`),event=ref.collection('events').doc();await db.runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists||s.get('production.status')!=='delivered_to_owner')throw new HttpsError('failed-precondition','Estamparia ainda não entregou o pedido ao proprietário.');tx.update(ref,{'production.status':'owner_checked','shipping.status':'dispatched','shipping.trackingCode':trackingCode.trim(),updatedAt:FieldValue.serverTimestamp()});tx.create(event,{type:'owner_checked_and_dispatched',actorUid:uid,createdAt:FieldValue.serverTimestamp()})});return{ok:true}});

