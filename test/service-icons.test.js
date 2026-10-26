import test from 'node:test';
import assert from 'node:assert/strict';
import { getServiceIconUrl, getServiceSlug, normalizeServiceKey } from '../src/shared/service-icons.js';

test('service icon lookup uses the service field and recognizes known aliases', () => {
  assert.equal(getServiceSlug('GitHub'), 'github');
  assert.equal(getServiceSlug('AWS'), 'amazonaws');
  assert.equal(getServiceSlug('Google Cloud'), 'googlecloud');
  assert.equal(getServiceSlug('monday.com'), 'mondaydotcom');
});

test('unknown and partially typed service names do not generate speculative icon URLs', () => {
  for (const value of ['', 'Gi', 'Gith', 'aw', 'my personal token']) {
    assert.equal(getServiceSlug(value), null, `expected no icon for ${JSON.stringify(value)}`);
    assert.equal(getServiceIconUrl(value), null, `expected no URL for ${JSON.stringify(value)}`);
  }
});

test('token names cannot influence service icon matching', () => {
  assert.equal(getServiceSlug('Unknown provider'), null);
  assert.equal(getServiceIconUrl('Unknown provider'), null);
  assert.equal(getServiceSlug('GitHub'), 'github');
});

test('service override keys remain normalized', () => {
  assert.equal(normalizeServiceKey(' Google Cloud '), 'googlecloud');
});
