import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isAllowedRendererUrl } from '../src/main/renderer-security.js';

const productionEntry = resolve('dist/index.html');
const productionUrl = pathToFileURL(productionEntry).href;

test('development renderer accepts only the local Vite origin', () => {
  const options = { development: true, expectedFilePath: productionEntry };
  assert.equal(isAllowedRendererUrl('http://localhost:5173/', options), true);
  assert.equal(isAllowedRendererUrl('http://localhost:5173/settings', options), true);
});

test('development renderer rejects remote, alternate-port, and credentialed URLs', () => {
  const options = { development: true, expectedFilePath: productionEntry };
  for (const url of [
    'https://localhost:5173/',
    'http://127.0.0.1:5173/',
    'http://localhost:5174/',
    'http://attacker.example/',
    'http://user:password@localhost:5173/',
    'not a url'
  ]) {
    assert.equal(isAllowedRendererUrl(url, options), false, url);
  }
});

test('production renderer accepts only the exact packaged entry point', () => {
  const options = { development: false, expectedFilePath: productionEntry };
  assert.equal(isAllowedRendererUrl(productionUrl, options), true);
  assert.equal(isAllowedRendererUrl(pathToFileURL(resolve('dist/other.html')).href, options), false);
  assert.equal(isAllowedRendererUrl('http://localhost:5173/', options), false);
  assert.equal(isAllowedRendererUrl('https://example.com/', options), false);
});

test('malformed and unsupported URLs fail closed', () => {
  const options = { development: false, expectedFilePath: productionEntry };
  for (const url of ['', 'file:///', 'javascript:alert(1)', 'https://example.com/%zz']) {
    assert.equal(isAllowedRendererUrl(url, options), false, url);
  }
});
