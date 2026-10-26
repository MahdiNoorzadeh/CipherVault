import keytar from 'keytar';

const SERVICE_NAME = 'CipherVault';
const ACCOUNT_NAME = 'master-key';

// CipherVault generates a 32-byte key encoded as 64 hexadecimal characters.
const MASTER_KEY_PATTERN = /^[a-f0-9]{64}$/i;

export async function getMasterKey() {
  try {
    const key = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);

    if (typeof key !== 'string' || !MASTER_KEY_PATTERN.test(key)) {
      return null;
    }

    return key;
  } catch {
    // Native keyring errors may contain system-specific details.
    // Return a safe failure signal; never log the key or raw error.
    return null;
  }
}

export async function setMasterKey(key) {
  if (typeof key !== 'string' || !MASTER_KEY_PATTERN.test(key)) {
    return false;
  }

  try {
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, key);
    return true;
  } catch {
    return false;
  }
}

export async function deleteMasterKey() {
  try {
    return await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
  } catch {
    return false;
  }
}
