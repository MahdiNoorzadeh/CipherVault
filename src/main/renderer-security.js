import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/**
 * Accept only the local Vite renderer during development and the exact built
 * entry point in production. Keep this module free of Electron dependencies so
 * origin policy can be regression-tested in Node.
 */
export function isAllowedRendererUrl(rawUrl, { development, expectedFilePath }) {
  try {
    const senderUrl = new URL(rawUrl);

    if (development) {
      return (
        senderUrl.protocol === 'http:' &&
        senderUrl.hostname === 'localhost' &&
        senderUrl.port === '5173' &&
        !senderUrl.username &&
        !senderUrl.password
      );
    }

    return (
      senderUrl.protocol === 'file:' &&
      fileURLToPath(senderUrl) === resolve(expectedFilePath)
    );
  } catch {
    return false;
  }
}
