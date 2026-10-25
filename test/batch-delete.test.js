import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_BATCH_DELETE_SIZE, validateBatchDeleteIds } from '../src/main/batch-delete.js';

const idA = '0123456789abcdef01234567';
const idB = 'abcdef0123456789abcdef01';

test('batch delete accepts valid IDs and canonicalizes case', () => {
  assert.deepEqual(validateBatchDeleteIds([idA, idB.toUpperCase()]), [idA, idB]);
});

test('batch delete rejects empty and non-array input', () => {
  assert.throws(() => validateBatchDeleteIds([]), /Invalid token IDs/);
  assert.throws(() => validateBatchDeleteIds(null), /Invalid token IDs/);
});

test('batch delete rejects malformed IDs and non-string values', () => {
  assert.throws(() => validateBatchDeleteIds(['not-an-id']), /Invalid token IDs/);
  assert.throws(() => validateBatchDeleteIds([42]), /Invalid token IDs/);
});

test('batch delete rejects duplicate IDs even when casing differs', () => {
  assert.throws(() => validateBatchDeleteIds([idA, idA.toUpperCase()]), /duplicates/);
});

test('batch delete enforces a maximum batch size', () => {
  const tooMany = Array.from({ length: MAX_BATCH_DELETE_SIZE + 1 }, (_, index) => index.toString(16).padStart(24, '0'));
  assert.throws(() => validateBatchDeleteIds(tooMany), /Invalid token IDs/);
});
