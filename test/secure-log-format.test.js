import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSecureLogRecord, shouldClearClipboard } from '../src/main/secure-log-format.js';

test('secure log records retain approved metadata only', () => {
  const record = buildSecureLogRecord('token.copied', {
    entity: 'token',
    outcome: 'success',
    tokenValue: 'must-not-appear',
    name: 'private token name',
    channel: 'copy-token',
    arbitrary: { secret: 'must-not-appear' }
  }, 'info', '2026-10-25T12:00:00.000Z');

  assert.deepEqual(record, {
    timestamp: '2026-10-25T12:00:00.000Z',
    level: 'info',
    event: 'token.copied',
    channel: 'copy-token',
    entity: 'token',
    outcome: 'success'
  });
  assert.equal(JSON.stringify(record).includes('must-not-appear'), false);
});

test('secure log formatter rejects unknown events and unapproved channels', () => {
  assert.equal(buildSecureLogRecord('unknown.event'), null);
  const record = buildSecureLogRecord('ipc.operation_failed', {
    channel: 'unexpected-channel',
    errorType: 'DatabaseError',
    message: 'sensitive details'
  });
  assert.equal('channel' in record, false);
  assert.equal('message' in record, false);
  assert.equal(record.errorType, 'DatabaseError');
});

test('clipboard cleanup only clears the exact secret CipherVault copied', () => {
  assert.equal(shouldClearClipboard('secret-a', 'secret-a'), true);
  assert.equal(shouldClearClipboard('some other text', 'secret-a'), false);
  assert.equal(shouldClearClipboard('', ''), false);
  assert.equal(shouldClearClipboard('secret-a', null), false);
});
