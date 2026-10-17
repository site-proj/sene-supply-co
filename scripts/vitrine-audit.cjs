const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4174/sene-supply-co/vitrine/');
  await page.locator('.product-card').first().waitFor();
  assert.equal(await page.locator('.product-card').count(),6);
  await page.locator('[data-filter="food"]').click();assert.equal(await page.locator('.product-card').count(),1);
  await page.locator('[data-filter="all"]').click();await page.locator('[data-product="destination"]').click();assert(await page.locator('#productDialog').evaluate(d=>d.open));
  await page.locator('#size').selectOption('M');const link=await page.locator('#dialogWhatsApp').getAttribute('href');assert(link.startsWith('https://wa.me/5547996102917?text='));assert(decodeURIComponent(link).includes('FUCK THE DESTINATION'));
  await page.locator('.dialog-close').click();await page.locator('img').evaluateAll(xs=>Promise.all(xs.map(i=>{i.loading='eager';return i.decode().catch(()=>{})})));
  assert.deepEqual(await page.locator('img').evaluateAll(xs=>xs.filter(i=>i.getAttribute('src')&&!i.naturalWidth).map(i=>i.src)),[]);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow');assert.deepEqual(errors,[]);
  console.log('PASS vitrine',width,'filters, product details, WhatsApp, images, overflow');await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
