import { app } from 'electron';
import { existsSync, mkdirSync, renameSync, statSync, appendFileSync, unlinkSync, chmodSync } from 'fs';
import { dirname, join } from 'path';
import { buildSecureLogRecord } from './secure-log-format.js';

const MAX_LOG_BYTES = 1024 * 1024;

function getLogPath() {
  return join(app.getPath('userData'), 'logs', 'ciphervault.log');
}

function rotateIfNeeded(path) {
  try {
    if (existsSync(path) && statSync(path).size >= MAX_LOG_BYTES) {
      const previousPath = `${path}.1`;
      if (existsSync(previousPath)) unlinkSync(previousPath);
      renameSync(path, previousPath);
    }
  } catch {
    // Logging must never break the application.
  }
}

export function writeSecureLog(event, metadata = {}, level = 'info') {
  const record = buildSecureLogRecord(event, metadata, level);
  if (!record) return;

  try {
    const path = getLogPath();
    mkdirSync(dirname(path), { recursive: true });
    rotateIfNeeded(path);
    appendFileSync(path, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });
    try { chmodSync(path, 0o600); } catch {}
  } catch {
    // Logging is best-effort and must not interrupt vault operations.
  }
}

export function logIpcFailure(channel, error) {
  writeSecureLog('ipc.operation_failed', {
    channel,
    outcome: 'failure',
    errorType: error instanceof Error ? error.name : 'UnknownError'
  }, 'error');
}
