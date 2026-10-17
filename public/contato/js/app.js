/* SENE Supply Co. — Landing page WhatsApp | Configuração central */
const STORE_CONFIG = Object.freeze({
  // WhatsApp informado pelo usuário e confirmado para a landing: (47) 99610-2917.
  whatsappDigits: '5547996102917',
  storeName: 'SENE Supply Co.',
  welcomeMessage: 'Olá! Conheci o Sene pelo site e gostaria de informações sobre as camisetas sob encomenda.'
});

const items = [
  {id:'ride', name:'FUCK THE DESTINATION', subtitle:'MOTO CULTURE / PRETA',image:'https://site-proj.github.io/sene-supply-co/assets/destination.jpg',detail:'Camiseta preta com estampa de motociclista nas costas.',tag:'MOTO CULTURE',category:'moto',color:'Preta'},
  {id:'negroni',name:'NEGRONI',subtitle:'FOOD & BOOZE / PRETA',image:'https://site-proj.github.io/sene-supply-co/assets/negroni-model.jpg',detail:'Camiseta preta com arte Negroni colorida nas costas.',tag:'FEATURED',category:'booze',color:'Preta'},
  {id:'classic-white',name:'CLASSIC LOGO — WHITE',subtitle:'SENE ORIGINAL / BRANCA',image:'https://site-proj.github.io/sene-supply-co/assets/classic-white.jpg',detail:'Camiseta branca com logo SENE no peito.',tag:'CLASSIC',category:'classic',color:'Branca'},
  {id:'roadback',name:'LUCKY DIRTY HANDS',subtitle:'MOTO CULTURE / PRETA',image:'https://site-proj.github.io/sene-supply-co/assets/rider.jpg',detail:'Camiseta preta com estampa circular nas costas.',tag:'NEW DROP',category:'moto',color:'Preta'},
  {id:'custom',name:'CUSTOM MOTORCYCLE',subtitle:'MOTO CULTURE / PRETA',image:'https://site-proj.github.io/sene-supply-co/assets/custom-back.jpg',detail:'Camiseta preta com estampa Custom Motorcycle nas costas.',tag:'MOTO CULTURE',category:'moto',color:'Preta'},
  {id:'classic-black',name:'SENE CLASSIC — BLACK',subtitle:'SENE ORIGINAL / PRETA',image:'https://site-proj.github.io/sene-supply-co/assets/classic-man.jpg',detail:'Camiseta preta com marca SENE no peito.',tag:'CLASSIC',category:'classic',color:'Preta'},
];
const graphics = [
  {id:'ride-art',name:'RIDE / FUCK THE DESTINATION',sub:'BACK PRINT',image:'https://site-proj.github.io/sene-supply-co/assets/destination-art.jpg',linked:'ride'},
  {id:'negroni-art',name:'NEGRONI ART',sub:'FULL-COLOR PRINT',image:'https://site-proj.github.io/sene-supply-co/assets/negroni.jpg',linked:'negroni'},
  {id:'chef-art',name:'CHEF DUCK',sub:'ORIGINAL ARTWORK',image:'https://site-proj.github.io/sene-supply-co/assets/duck-chef.jpg',linked:'chef-art'},
  {id:'cleaver-art',name:'CLEAVER CLUB',sub:'FOOD. BOOZE. MACHINES.',image:'https://site-proj.github.io/sene-supply-co/assets/cleaver-logo.jpg',linked:'cleaver-art'},
  {id:'octopus-art',name:'KITCHEN CHAOS',sub:'ORIGINAL ARTWORK',image:'https://site-proj.github.io/sene-supply-co/assets/octopus-art.jpg',linked:'octopus-art'}
];
const byId=id=>document.getElementById(id);
const waUrl = text => `https://wa.me/${STORE_CONFIG.whatsappDigits}?text=${encodeURIComponent(text)}`;
const safe = text=>String(text).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function renderProducts(){
  byId('featuredTrack').innerHTML=items.map(item=>`<article class="product-card" role="group" aria-label="${safe(item.name)}" tabindex="0" data-product="${item.id}">
    <div class="card-image"><img src="${item.image}" loading="lazy" alt="${safe(item.detail)}"><span class="card-badge">${safe(item.tag)}</span><button type="button" class="card-quick" data-product="${item.id}" aria-label="Consultar ${safe(item.name)}">↗</button></div>
    <div class="card-caption"><div><h3>${safe(item.name)}</h3><p>${safe(item.subtitle)}</p></div><span>CONSULTAR ↗</span></div>
  </article>`).join('');
  byId('graphicsTrack').innerHTML=graphics.map(g=>`<article class="graphic-card" role="group" tabindex="0" data-product="${g.linked}"><div class="graphic-art"><img src="${g.image}" loading="lazy" alt="Arte ${safe(g.name)}"><span class="see">CONSULTAR ↗</span></div><h3>${safe(g.name)}</h3><p>${safe(g.sub)}</p></article>`).join('');
  document.querySelectorAll('[data-product]').forEach(card=>{
    card.addEventListener('click',event=>{if(!event.target.closest('a'))openProduct(card.dataset.product)});
    card.addEventListener('keydown',event=>{if(event.target===card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openProduct(card.dataset.product)}});
  });
}

let selected=null;let qty=1;
const dialog=byId('productDialog');
function messageFor(product){
 const size=byId('shirtSize').value;
 const fit=byId('shirtFit').value;
 return `Olá! Vi o Sene pelo site e quero consultar uma camiseta.\n\n• Modelo: ${product.name}\n• Cor de referência: ${product.color}\n• Tamanho pretendido: ${size}\n• Modelagem: ${fit}\n• Quantidade: ${qty}\n\nPode me informar preço, opções disponíveis e prazo de produção/entrega?`;
}
function refreshWA(){if(selected)byId('dialogWa').href=waUrl(messageFor(selected))}
function openProduct(id){
  selected=items.find(x=>x.id===id);
  if(!selected){const artwork=graphics.find(g=>g.id===id);if(artwork)selected={name:artwork.name,image:artwork.image,color:'A consultar',detail:'Arte de referência para camiseta SENE. Consulte possibilidade de produção, cores e modelagem.'};}
  if(!selected)return;
  qty=1;byId('qtyCount').textContent=qty;byId('shirtSize').value='A definir';byId('shirtFit').value='A definir';
  byId('dialogTitle').textContent=selected.name;
  byId('dialogDesc').textContent=selected.detail;
  byId('dialogImg').src=selected.image;
  byId('dialogImg').alt=selected.detail;
  refreshWA();dialog.showModal();document.body.classList.add('modal-open');
}
byId('dialogClose').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>document.body.classList.remove('modal-open'));
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
byId('shirtSize').addEventListener('change',refreshWA);
byId('shirtFit').addEventListener('change',refreshWA);
byId('qtyMinus').addEventListener('click',()=>{qty=Math.max(1,qty-1);byId('qtyCount').textContent=qty;refreshWA()});
byId('qtyPlus').addEventListener('click',()=>{qty=Math.min(99,qty+1);byId('qtyCount').textContent=qty;refreshWA()});

function wireGeneralWhatsApp(){document.querySelectorAll('.js-wa-general').forEach(a=>{a.href=waUrl(STORE_CONFIG.welcomeMessage);a.target='_blank';a.rel='noopener noreferrer'})}
function setupCarousels(){
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function advance(track, direction=1){
    const card=track.firstElementChild;if(!card)return;
    const step=card.getBoundingClientRect().width+17;
    const limit=track.scrollWidth-track.clientWidth;
    const desired=track.scrollLeft+step*direction;
    track.scrollTo({left:direction>0&&desired>limit-5?0:direction<0&&desired<0?limit:desired,behavior:reduceMotion.matches?'instant':'smooth'});
  }
  function updateProgress(track,bar){let limit=track.scrollWidth-track.clientWidth;let percent=limit>0?track.scrollLeft/limit:0;bar.style.transform=`translateX(${percent*300}%)`;}
  for(const name of ['featured','graphics']){
    const track=byId(name+'Track'), bar=byId(name+'Progress');
    let down=false,mouseStart=0,startScroll=0,moved=false;
    track.addEventListener('scroll',()=>updateProgress(track,bar),{passive:true});
    window.addEventListener('resize',()=>updateProgress(track,bar),{passive:true});
    // Native touch scrolling; mouse drag for desktop without a trackpad
    track.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){down=true;moved=false;mouseStart=e.clientX;startScroll=track.scrollLeft}});
    track.addEventListener('pointermove',e=>{if(down){if(Math.abs(e.clientX-mouseStart)>8){moved=true;track.scrollLeft=startScroll-(e.clientX-mouseStart)}}});
    window.addEventListener('pointerup',()=>{down=false});
    track.addEventListener('click',e=>{if(moved){e.stopPropagation();e.preventDefault();moved=false}},true);
    if(!reduceMotion.matches){
      let paused=false;
      track.addEventListener('mouseenter',()=>paused=true);track.addEventListener('mouseleave',()=>paused=false);
      track.addEventListener('focusin',()=>paused=true);track.addEventListener('focusout',()=>paused=false);
      const observer=new IntersectionObserver(entries=>{track.dataset.visible=entries[0].isIntersecting?'yes':'no'},{threshold:.25});observer.observe(track);
      setInterval(()=>{if(!paused&&track.dataset.visible==='yes'&&!dialog.open&&document.visibilityState==='visible')advance(track,1)},name==='featured'?4500:5300);
    }
  }
  document.querySelectorAll('.arrow-btn').forEach(btn=>btn.addEventListener('click',()=>advance(byId(btn.dataset.target),btn.dataset.dir==='next'?1:-1)));
}
function wireMobileMenu(){const toggle=byId('menuToggle'),nav=byId('mobileNav');toggle.addEventListener('click',()=>{let expanded=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!expanded));toggle.setAttribute('aria-label',expanded?'Abrir menu':'Fechar menu');nav.classList.toggle('open',!expanded)});nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{toggle.setAttribute('aria-expanded','false');nav.classList.remove('open')}));}
renderProducts();wireGeneralWhatsApp();setupCarousels();wireMobileMenu();byId('year').textContent=String(new Date().getFullYear());