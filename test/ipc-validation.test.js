import test from 'node:test';
import assert from 'node:assert/strict';
import {
  requireNonEmptyString,
  requireObjectIdString,
  requireEnvironmentType,
  requireTokenData,
  requireTokenValue
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

test('requireTokenData trims metadata fields and preserves token value exactly', () => {
  assert.deepEqual(
    requireTokenData({
      name: '  GitHub  ',
      service: '  GitHub API  ',
      value: '  secret-value  '
    }),
    {
      name: 'GitHub',
      service: 'GitHub API',
      value: '  secret-value  '
    }
  );
});


test('requireTokenValue preserves meaningful whitespace and rejects empty or oversized values', () => {
  assert.equal(requireTokenValue('  secret-value\n'), '  secret-value\n');
  assert.throws(() => requireTokenValue('   '), /Invalid token value/);
  assert.throws(() => requireTokenValue('x'.repeat(10001)), /Invalid token value/);
});

test('requireTokenData rejects invalid payload types', () => {
  for (const value of [null, undefined, [], 'token', 123, true]) {
    assert.throws(() => requireTokenData(value), {
      name: 'TypeError',
      message: 'Invalid token data'
    });
  }
});

test('requireTokenData rejects missing and unexpected fields', () => {
  assert.throws(
  () => requireTokenData({ name: 'GitHub', service: 'API' }),
  /Invalid token data/
  );

  assert.throws(
    () => requireTokenData({
      name: 'GitHub',
      service: 'API',
      value: 'secret',
      environmentId: 'unexpected'
    }),
    /Invalid token data/
  );
});

test('requireTokenData enforces string and length limits', () => {
  const valid = {
    name: 'GitHub',
    service: 'API',
    value: 'secret'
  };

  assert.throws(
    () => requireTokenData({ ...valid, name: ' '.repeat(201) }),
    /Invalid token name/
  );

  assert.throws(
    () => requireTokenData({ ...valid, value: 'x'.repeat(10001) }),
    /Invalid token value/
  );

  assert.throws(
    () => requireTokenData({ ...valid, service: '' }),
    /Invalid service name/
  );
});