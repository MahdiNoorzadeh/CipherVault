import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// Keep the current record format and IV length for backward compatibility.
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function deriveKey(masterKey) {
  if (typeof masterKey !== 'string' || masterKey.length === 0) {
    throw new TypeError('A master key is required');
  }

  // This derivation is retained so tokens encrypted by existing releases remain readable.
  const salt = crypto.createHash('sha256').update(masterKey).digest();
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512');
}

/** Encrypt a token using the existing IV:tag:ciphertext hex format. */
export function encryptToken(plaintext, masterKey) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new TypeError('A non-empty token value is required');
  }
  if (typeof masterKey !== 'string' || masterKey.length === 0) {
    throw new TypeError('A master key is required');
  }

  try {
    const key = deriveKey(masterKey);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch {
    // Do not log plaintext, key material, ciphertext, or low-level crypto details.
    throw new Error('Failed to encrypt token');
  }
}

/** Decrypt an existing CipherVault token record. */
export function decryptToken(encryptedData, masterKey) {
  if (typeof encryptedData !== 'string' || encryptedData.length === 0) {
    throw new TypeError('Encrypted token data is required');
  }
  if (typeof masterKey !== 'string' || masterKey.length === 0) {
    throw new TypeError('A master key is required');
  }

  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3 || parts.some((part) => !/^(?:[0-9a-fA-F]{2})*$/.test(part))) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH || encrypted.length === 0) {
      throw new Error('Invalid encrypted token lengths');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(masterKey), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    // Avoid logging potentially sensitive input or low-level cryptographic details.
    throw new Error('Failed to decrypt token');
  }
}
