import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const base = 'https://site-proj.github.io/sene-supply-co/';
for (const file of ['index.html','src.js']) {
 const source=readFileSync(file,'utf8');
 assert(!/location\.(?:href\s*=|assign\()\s*[`'"]\/(?!\/)/.test(source), `${file}: root navigation`);
 for (const [,link] of source.matchAll(/href="([^"]+)"/g)) {
  if(link.includes('${')) continue;
  const url=new URL(link,base);
  if(url.origin===new URL(base).origin) assert(url.pathname.startsWith('/sene-supply-co/'), `${file}: ${link}`);
 }
}
for(const file of ['index.html','js/app.js','css/style.css']) assert.equal(readFileSync('contato/'+file,'utf8'),readFileSync('public/contato/'+file,'utf8'), 'Landing copies diverged: '+file);
assert(readFileSync('dist/index.html','utf8').includes('<base href="/sene-supply-co/">'));
assert(readFileSync('dist/contato/index.html','utf8').includes('FALE COM O SENE'));
console.log('PASS: source navigation, build base, separate landing, synchronized copies');

for (const file of ['dist/index.html','dist/contato/index.html']) {
 for(const [,link] of readFileSync(file,'utf8').matchAll(/(?:href|src)="([^"]+)"/g)){
 const url=new URL(link,file.includes('/contato/')?base+'contato/':base);
 if(url.origin===new URL(base).origin)assert(url.pathname.startsWith('/sene-supply-co/'),file+': '+link);
 }
}
console.log('PASS: built links and assets stay in Sene');


const showcase=readFileSync('dist/vitrine/index.html','utf8');
assert(showcase.includes('id="products"'));
assert(showcase.includes('id="productDialog"'));
assert(readFileSync('dist/vitrine/app.js','utf8').includes('5547996102917'));
for(const [,link] of showcase.matchAll(/(?:href|src)="([^"]+)"/g)) {
 const url=new URL(link,base+'vitrine/');
 if(url.origin===new URL(base).origin)assert(url.pathname.startsWith('/sene-supply-co/'),'vitrine: '+link);
}
console.log('PASS: Vitrine route, product dialog, WhatsApp and scoped assets');
