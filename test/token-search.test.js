import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTokensByQuery } from '../src/shared/token-search.js';

const tokens = [
  { _id: '1', name: 'GitHub Personal', service: 'GitHub API', value: undefined },
  { _id: '2', name: 'AWS Prod', service: 'Amazon Web Services', value: undefined },
  { _id: '3', name: 'Sentry', service: 'Error Tracking', value: undefined }
];

test('empty search returns the original collection without mutation', () => {
  assert.equal(filterTokensByQuery(tokens, ''), tokens);
  assert.deepEqual(tokens.map((token) => token._id), ['1', '2', '3']);
});

test('search matches token names and service names case-insensitively', () => {
  assert.deepEqual(filterTokensByQuery(tokens, 'GITHUB').map((token) => token._id), ['1']);
  assert.deepEqual(filterTokensByQuery(tokens, 'amazon').map((token) => token._id), ['2']);
  assert.deepEqual(filterTokensByQuery(tokens, 'error TRACKING').map((token) => token._id), ['3']);
});

test('search trims query whitespace and returns no false matches', () => {
  assert.deepEqual(filterTokensByQuery(tokens, '  aws  ').map((token) => token._id), ['2']);
  assert.deepEqual(filterTokensByQuery(tokens, 'not found'), []);
});

test('search only inspects metadata and safely handles malformed collections', () => {
  const secret = 'secret-value-not-searchable';
  assert.deepEqual(filterTokensByQuery([{ name: 'Token', service: 'Service', value: secret }], secret), []);
  assert.deepEqual(filterTokensByQuery(null, 'anything'), []);
});
