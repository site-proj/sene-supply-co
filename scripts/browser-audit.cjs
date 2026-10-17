const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,channel:"msedge"});
const base=process.env.SENE_TEST_URL||'http://127.0.0.1:4173/sene-supply-co/';
for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}); const page=await context.newPage(); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 async function audit(){
  await page.locator('main').waitFor(); await page.waitForTimeout(300);
  const bad=await page.evaluate(()=>[...document.querySelectorAll('a[href],img[src],script[src],link[href]')].map(e=>e.href||e.src).filter(u=>{const x=new URL(u,location.href);return x.origin===location.origin&&!x.pathname.startsWith('/sene-supply-co/')}));assert.deepEqual(bad,[]);
  await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode().catch(()=>{})})));
  assert.deepEqual(await page.locator('img').evaluateAll(xs=>xs.filter(i=>i.getAttribute("src") && !i.naturalWidth).map(i=>i.src)),[]);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow '+page.url());
 }
 await page.goto(base);await audit();
 await page.locator('.hero-image-open').click();assert(await page.locator('.photo-lightbox').evaluate(d=>d.open));await page.locator('.lightbox-close').click();
 if(width===390){await page.locator('.menu-toggle').click();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');}
 await page.locator('.nav a').filter({hasText:'SHOP'}).click();await audit();assert(page.url().includes('page=catalog'));
 await page.locator('.catalog-info a').first().click();await audit();
 await page.locator('#size').selectOption('L');await page.locator('.detail-add').click();await page.locator('.bag-btn').click();assert(await page.locator('.cart-items').innerText());
 await page.locator('.checkout-btn').click();await audit();assert.equal(new URL(page.url()).pathname,'/sene-supply-co/');assert(page.url().includes('page=checkout'));assert(await page.locator('#checkout-submit').isDisabled());await page.reload();await audit();
 for(const route of ['catalog','account','owner','production']){await page.goto(base+'?page='+route);await audit();await page.reload();await audit();}
 await page.goto(base);await page.locator('.search-toggle').click();await page.locator('.search-modal input').fill('NEGRONI');await page.locator('.search-modal .cream-button').click();await audit();assert(page.url().includes('search=NEGRONI'));
 await page.goto(base+'contato/');await audit();await page.reload();await audit();
 const wa=await page.locator('.js-wa-general').evaluateAll(xs=>xs.map(x=>x.href));assert(wa.every(x=>new URL(x).hostname==='wa.me'&&new URL(x).pathname==='/5547996102917'));
 await page.locator('[data-product]').first().click();assert(await page.locator('#productDialog').evaluate(d=>d.open));assert((await page.locator('#dialogWa').getAttribute('href')).includes('5547996102917'));await page.locator('#dialogClose').click();
 assert.deepEqual(errors,[]);console.log('PASS',width,base,'navigation, photos, catalog, product, cart, checkout, search, account gates, refresh, landing, WhatsApp, images, overflow');await context.close();
}
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


