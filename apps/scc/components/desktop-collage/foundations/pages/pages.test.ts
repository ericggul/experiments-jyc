import assert from 'node:assert/strict';
import test from 'node:test';
import { colorPage } from './index.ts';


test('colour pages are self-contained UTF-8 data URLs with the colour as theme', () => {
  const url = colorPage('#ff2e93');
  assert.ok(url.startsWith('data:text/html;charset=utf-8,'));
  const html = decodeURIComponent(url.slice(url.indexOf(',') + 1));
  assert.match(html, /<meta charset="utf-8">/);
  assert.match(html, /theme-color" content="#ff2e93"/);
  assert.match(html, /background:#ff2e93/);
});
