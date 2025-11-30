import keytar from 'keytar';

const SERVICE_NAME = 'CipherVault';
const ACCOUNT_NAME = 'master-key';

/**
 * Retrieves the master encryption key from the OS keyring
 * @returns {Promise<string|null>} The master key or null if not found
 */
export async function getMasterKey() {
  try {
    const key = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    return key;
  } catch (error) {
    console.error('Error retrieving master key from keyring:', error);
    return null;
  }
}

/**
 * Stores the master encryption key in the OS keyring
 * @param {string} key - The master key to store
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function setMasterKey(key) {
  try {
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, key);
    console.log('Master key stored in OS keyring');
    return true;
  } catch (error) {
    console.error('Error storing master key in keyring:', error);
    return false;
  }
}

/**
 * Deletes the master encryption key from the OS keyring
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function deleteMasterKey() {
  try {
    const deleted = await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    return deleted;
  } catch (error) {
    console.error('Error deleting master key from keyring:', error);
    return false;
  }
}

