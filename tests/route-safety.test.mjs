import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const base = 'https://site-proj.github.io/sene-supply-co/';

test('Vite publishes to the Sene repository path, never the organization root', () => {
  const vite = read('vite.config.js');
  assert.match(vite, /base:\s*['"]\/sene-supply-co\/['"]/);
  assert.match(read('index.html'), /<base href="%BASE_URL%">/);
});

test('Checkout and search stay in the Sene project', () => {
  const js = read('src.js');
  assert.doesNotMatch(js, /location\.href\s*=\s*['"`]\/\?/);
  assert.doesNotMatch(js, /location\.assign\(\s*['"`]\/\?/);
  assert.match(js, /new URL\('\.\/\?page=checkout', document\.baseURI\)/);
  assert.match(js, /new URL\(`\.\/\?page=catalog&search=/);
  for (const path of [
    './?page=catalog',
    './?page=product&id=destination-tee',
    './?page=account',
    './?page=checkout',
    './?page=owner',
    './?page=production',
    './?page=catalog&search=negroni',
    './#featured',
  ]) {
    const result = new URL(path, base);
    assert.equal(result.origin, 'https://site-proj.github.io');
    assert.equal(result.pathname, '/sene-supply-co/');
  }
});

test('Main navigation never links to the GitHub Pages root or to other projects', () => {
  const html = read('index.html');
  for (const [, href] of html.matchAll(/href="([^"]*)"/g)) {
    if (/^(?:https?:|mailto:|tel:|#)/.test(href)) continue;
    if (href === '%BASE_URL%') continue;
    assert.ok(new URL(href, base).pathname.startsWith('/sene-supply-co/'), href);
  }
  assert.doesNotMatch(html + read('src.js'), /site-proj\.github\.io\/(?:\?|#)/);
});

test('WhatsApp landing is isolated and never sends checkout traffic to a different site', () => {
  const html = read('public/contato/index.html');
  const js = read('public/contato/js/app.js');
  assert.match(html, /FALE COM O SENE/);
  assert.match(js, /5547996102917/);
  assert.match(js, /Conheci o Sene|Vi o Sene/);
  assert.doesNotMatch(html + js, /\/?\?page=checkout/);
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^https:\/\/site-proj\.github\.io/.test(url)) {
      assert.ok(new URL(url).pathname.startsWith('/sene-supply-co/'), url);
    } else if (/^(?:https?:|#|mailto:|tel:)/.test(url)) {
      continue;
    } else {
      assert.ok(new URL(url, base + 'contato/').pathname.startsWith('/sene-supply-co/'), url);
    }
  }
});
