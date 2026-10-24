import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptToken, decryptToken } from '../src/main/crypto-utils.js';

const masterKey = 'test-master-key-for-ciphervault';

test('encryptToken produces a decryptable token', () => {
  const plaintext = 'cv_test_secret_123';
  const encrypted = encryptToken(plaintext, masterKey);
  assert.notEqual(encrypted, plaintext);
  assert.equal(decryptToken(encrypted, masterKey), plaintext);
});

test('encryptToken uses a fresh IV for each encryption', () => {
  const first = encryptToken('same secret', masterKey);
  const second = encryptToken('same secret', masterKey);
  assert.notEqual(first, second);
  assert.equal(decryptToken(first, masterKey), 'same secret');
  assert.equal(decryptToken(second, masterKey), 'same secret');
});

test('decryptToken rejects modified ciphertext and incorrect keys', () => {
  const encrypted = encryptToken('secret', masterKey);
  const [iv, tag, ciphertext] = encrypted.split(':');
  const replacement = `${iv}:${tag}:${ciphertext.slice(0, -2)}00`;
  assert.throws(() => decryptToken(replacement, masterKey), /Failed to decrypt token/);
  assert.throws(() => decryptToken(encrypted, 'wrong-key'), /Failed to decrypt token/);
});

test('decryptToken rejects malformed records', () => {
  for (const value of ['', 'a:b:c', 'not-hex:00:00', '00:00:zz']) {
    assert.throws(() => decryptToken(value, masterKey));
  }
});

test('encryptToken rejects missing inputs', () => {
  assert.throws(() => encryptToken('', masterKey));
  assert.throws(() => encryptToken('secret', ''));
});
