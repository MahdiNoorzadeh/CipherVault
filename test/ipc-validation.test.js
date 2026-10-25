import test from 'node:test';
import assert from 'node:assert/strict';
import {
  requireNonEmptyString,
  requireObjectIdString,
  requireEnvironmentType
} from '../src/main/ipc-validation.js';

test('requireNonEmptyString trims valid strings', () => {
  assert.equal(requireNonEmptyString('  CipherVault  ', 'name'), 'CipherVault');
});

test('requireNonEmptyString rejects empty and whitespace-only strings', () => {
  for (const value of ['', ' ', '\t\n']) {
    assert.throws(() => requireNonEmptyString(value, 'name'), {
      name: 'TypeError',
      message: 'Invalid name'
    });
  }
});

test('requireNonEmptyString rejects non-string values', () => {
  for (const value of [null, undefined, 123, {}, [], true]) {
    assert.throws(() => requireNonEmptyString(value, 'name'), TypeError);
  }
});

test('requireNonEmptyString enforces the maximum trimmed length', () => {
  assert.equal(requireNonEmptyString('x'.repeat(100), 'name', 100).length, 100);
  assert.throws(
    () => requireNonEmptyString('x'.repeat(101), 'name', 100),
    /Invalid name/
  );
  assert.equal(requireNonEmptyString('  ok  ', 'name', 2), 'ok');
});

test('requireObjectIdString accepts 24-character hexadecimal IDs', () => {
  const lowerCaseId = '0123456789abcdef01234567';
  const upperCaseId = 'ABCDEF0123456789ABCDEF01';

  assert.equal(requireObjectIdString(lowerCaseId), lowerCaseId);
  assert.equal(requireObjectIdString(upperCaseId), upperCaseId);
});

test('requireObjectIdString rejects malformed IDs and non-strings', () => {
  for (const value of [
    '',
    '0123456789abcdef0123456',
    '0123456789abcdef012345678',
    '0123456789abcdef0123456g',
    '0123456789abcdef 1234567',
    null,
    undefined,
    123
  ]) {
    assert.throws(() => requireObjectIdString(value, 'project ID'), {
      name: 'TypeError',
      message: 'Invalid project ID'
    });
  }
});

test('requireEnvironmentType accepts only supported environment types', () => {
  assert.equal(requireEnvironmentType('Production'), 'Production');
  assert.equal(requireEnvironmentType('Development'), 'Development');
});

test('requireEnvironmentType rejects unsupported values', () => {
  for (const value of [
    '',
    'production',
    'development',
    'Staging',
    null,
    undefined,
    123
  ]) {
    assert.throws(() => requireEnvironmentType(value), {
      name: 'TypeError',
      message: 'Invalid environment type'
    });
  }
});
