import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives a 32-byte key from the master key using PBKDF2
 * @param {string} masterKey - The master key string
 * @returns {Buffer} Derived key
 */
function deriveKey(masterKey) {
  // Use a fixed salt for consistency (in production, consider using a per-encryption salt stored with the data)
  const salt = crypto.createHash('sha256').update(masterKey).digest();
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypts a token value using AES-256-GCM
 * @param {string} plaintext - The token value to encrypt
 * @param {string} masterKey - The master encryption key
 * @returns {string} Encrypted value (hex encoded)
 */
export function encryptToken(plaintext, masterKey) {
  if (!plaintext || !masterKey) {
    throw new Error('Plaintext and master key are required');
  }

  try {
    const key = deriveKey(masterKey);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    // Combine IV, tag, and encrypted data
    const combined = iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
    return combined;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypts a token value using AES-256-GCM
 * @param {string} encryptedData - The encrypted token value (hex encoded)
 * @param {string} masterKey - The master encryption key
 * @returns {string} Decrypted token value
 */
export function decryptToken(encryptedData, masterKey) {
  if (!encryptedData || !masterKey) {
    throw new Error('Encrypted data and master key are required');
  }

  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const key = deriveKey(masterKey);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt token');
  }
}

