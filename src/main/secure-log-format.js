const ALLOWED_EVENTS = new Set([
  'app.startup',
  'app.startup_failed',
  'ipc.operation_failed',
  'token.created',
  'token.updated',
  'token.deleted',
  'token.revealed',
  'token.copied',
  'token.clipboard_cleared'
]);

const ALLOWED_CHANNELS = new Set([
  'get-projects', 'create-project', 'update-project', 'delete-project',
  'get-environments', 'get-or-create-environment', 'get-tokens',
  'get-token-value', 'copy-token', 'create-token', 'update-token', 'delete-token'
]);

export function buildSecureLogRecord(event, metadata = {}, level = 'info', timestamp = new Date().toISOString()) {
  if (!ALLOWED_EVENTS.has(event)) return null;

  return {
    timestamp,
    level: level === 'error' ? 'error' : 'info',
    event,
    ...(ALLOWED_CHANNELS.has(metadata.channel) ? { channel: metadata.channel } : {}),
    ...(metadata.entity === 'token' || metadata.entity === 'project' || metadata.entity === 'environment'
      ? { entity: metadata.entity }
      : {}),
    ...(metadata.outcome === 'success' || metadata.outcome === 'failure'
      ? { outcome: metadata.outcome }
      : {}),
    ...(typeof metadata.errorType === 'string' && /^[A-Za-z]+Error$/.test(metadata.errorType)
      ? { errorType: metadata.errorType.slice(0, 40) }
      : {})
  };
}

export function shouldClearClipboard(currentClipboard, expectedSecret) {
  return typeof expectedSecret === 'string' && expectedSecret.length > 0 && currentClipboard === expectedSecret;
}
