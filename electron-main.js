import { requireNonEmptyString, requireObjectIdString, requireEnvironmentType, requireTokenData } from './src/main/ipc-validation.js';
import { app, BrowserWindow, dialog, ipcMain, clipboard } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import Realm from 'realm';
import crypto from 'crypto';
import { initRealm, getRealmInstance } from './src/main/realm-config.js';
import { getMasterKey, setMasterKey } from './src/main/keytar-manager.js';
import { encryptToken, decryptToken } from './src/main/crypto-utils.js';
import { writeSecureLog, logIpcFailure } from './src/main/secure-logger.js';
import { shouldClearClipboard } from './src/main/secure-log-format.js';
import { DEFAULT_SHORTCUTS, validateShortcuts } from './src/main/keyboard-shortcuts.js';
import { validateBatchDeleteIds } from './src/main/batch-delete.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let realmInstance;
let clipboardClearTimer = null;
let lastCopiedSecret = null;
const CLIPBOARD_CLEAR_DELAY_MS = 30_000;

function clearClipboardIfStillOwned() {
  if (lastCopiedSecret === null) return;
  try {
    if (shouldClearClipboard(clipboard.readText(), lastCopiedSecret)) {
      clipboard.clear();
      writeSecureLog('token.clipboard_cleared');
    }
  } catch {
    // Clipboard access may be unavailable; never let cleanup crash the app.
  } finally {
    lastCopiedSecret = null;
    clipboardClearTimer = null;
  }
}

function scheduleClipboardClear(value) {
  if (clipboardClearTimer) clearTimeout(clipboardClearTimer);
  lastCopiedSecret = value;
  clipboardClearTimer = setTimeout(clearClipboardIfStillOwned, CLIPBOARD_CLEAR_DELAY_MS);
  clipboardClearTimer.unref?.();
}

function isDevelopmentMode() {
  return !app.isPackaged && process.env.NODE_ENV === 'development';
}

function isAllowedRendererUrl(rawUrl) {
  try {
    const senderUrl = new URL(rawUrl);

    if (isDevelopmentMode()) {
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
      fileURLToPath(senderUrl) === resolve(__dirname, 'dist', 'index.html')
    );
  } catch {
    return false;
  }
}

function assertTrustedIpcSender(event) {
  const frame = event.senderFrame;

  // Only accept IPC from the main application window and its main frame.
  if (
    !mainWindow ||
    event.sender !== mainWindow.webContents ||
    !frame ||
    frame !== event.sender.mainFrame
  ) {
    throw new Error('Unauthorized IPC sender');
  }

  // The renderer must be the expected local dev server (development only)
  // or the exact packaged HTML entry point. Never trust an arbitrary page.
  if (!isAllowedRendererUrl(frame.url)) {
    throw new Error('Unauthorized IPC sender URL');
  }
}

function handleIpc(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      assertTrustedIpcSender(event);
      return await handler(event, ...args);
    } catch (error) {
      // Never log IPC arguments or raw error messages: either can contain secrets.
      logIpcFailure(channel, error);
      const safeError = new Error(
        error instanceof TypeError && /^Invalid /.test(error.message)
          ? error.message
          : 'Unable to complete the requested operation. Please try again.'
      );
      safeError.name = error instanceof TypeError && /^Invalid /.test(error.message)
        ? 'TypeError'
        : 'Error';
      throw safeError;
    }
  });
}

// Initialize Realm and master key on app startup
app.whenReady().then(async () => {
  try {
    // Ensure master key exists
    let masterKey = await getMasterKey();
    if (!masterKey) {
      const existingRealmPath = join(app.getPath('userData'), 'ciphervault.realm');
      if (existsSync(existingRealmPath)) {
        throw new Error('The encryption key is missing from the OS keyring while a vault database exists. Refusing to generate a replacement key.');
      }
      masterKey = crypto.randomBytes(32).toString('hex');
      const stored = await setMasterKey(masterKey);
      if (!stored) {
        throw new Error('Unable to store the encryption key in the OS keyring. CipherVault will not start.');
      }
    }

    // Verify keyring access before opening the vault. Never continue with an
    // in-memory-only key, because newly encrypted data would become unrecoverable.
    const verifiedMasterKey = await getMasterKey();
    if (!verifiedMasterKey) {
      throw new Error('Unable to retrieve the encryption key from the OS keyring. CipherVault will not start.');
    }

    // Initialize Realm
    realmInstance = await initRealm();
    writeSecureLog('app.startup');
    createWindow();
  } catch (error) {
    // Fail closed: do not leave a headless process running after secure storage
    // or keyring initialization fails. Keep details in logs, not the dialog.
    writeSecureLog('app.startup_failed', { outcome: 'failure', errorType: error instanceof Error ? error.name : 'UnknownError' }, 'error');
    // Keep diagnostics to a safe error category; native errors can include
    // local paths or implementation details that should not reach the console.

    dialog.showErrorBox(
      'CipherVault could not start',
      'CipherVault could not initialize secure storage or access the operating-system keyring. Check your system keyring and try again.'
    );
    app.quit();
  }
});

function createWindow() {
  // Set application icon (if available)
  let iconPath;
  try {
    const iconName = process.platform === 'win32' ? 'icon.ico' : 
                     process.platform === 'darwin' ? 'icon.icns' : 'icon.png';
    iconPath = join(__dirname, 'build', iconName);
    // Check if file exists, if not, iconPath will be undefined and Electron will use default
    if (!existsSync(iconPath)) {
      iconPath = undefined;
      // Missing optional icon is non-fatal; use Electron's default icon.

    } else {
      // Avoid logging absolute local paths in the main-process console.

    }
  } catch {
    // Icon loading is optional and must not prevent startup.
    iconPath = undefined;
  }
  
  const windowOptions = {
    width: 1200,
    height: 800,
    // Memory optimizations
    backgroundColor: '#1e1e1e', // Match dark theme to avoid white flash
    show: false, // Don't show until ready
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      // Memory optimizations
      enableRemoteModule: false,
      spellcheck: false, // Disable spellcheck to save memory
      // Enable hardware acceleration but limit resources
      enableWebSQL: false,
      // Reduce memory usage
      backgroundThrottling: true,
      // Optimize for performance
      offscreen: false
    }
  };
  
  // Add icon if available
  if (iconPath) {
    windowOptions.icon = iconPath;
  }
  
  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isAllowedRendererUrl(targetUrl)) event.preventDefault();
  });

  // Show window only when ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  // In development, try to load from Vite dev server, otherwise use built files
  // Check if app is packaged (production build) or if NODE_ENV is explicitly set to development
  const isDev = isDevelopmentMode();
  
  if (isDev) {
    const devServerUrl = 'http://localhost:5173';
    // Development-only renderer loading; production never uses this URL.

    
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
    
    // Handle load failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      if (errorCode === -106 || errorCode === -105) {
        console.error('CipherVault development renderer failed to load. Start it with "npm run electron:dev".');
      }
    });
  } else {
    const indexPath = join(__dirname, 'dist/index.html');
    mainWindow.loadFile(indexPath);
  }
}

app.on('before-quit', () => {
  if (clipboardClearTimer) clearTimeout(clipboardClearTimer);
  clearClipboardIfStillOwned();

  // Release the native Realm handle cleanly so its file lock is not left open
  // during shutdown or application updates.
  try {
    if (realmInstance && !realmInstance.isClosed) {
      realmInstance.close();
    }
  } catch {
    // Shutdown cleanup is best-effort; do not block application exit.
  } finally {
    realmInstance = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers for Projects
handleIpc('get-projects', async () => {
  const realm = getRealmInstance();
  const projects = realm.objects('Project');

  return Array.from(projects).map((project) => ({
    _id: project._id.toString(),
    name: project.name
  }));
});

handleIpc('create-project', async (event, name) => {
  const projectName = requireNonEmptyString(name, 'project name', 100);
  const realm = getRealmInstance();

  realm.write(() => {
    realm.create('Project', {
      _id: new Realm.BSON.ObjectId(),
      name: projectName
    });
  });
  return Array.from(realm.objects('Project')).map((project) => ({
    _id: project._id.toString(),
    name: project.name
  }));
});

handleIpc('update-project', async (event, id, name) => {
  const projectId = getObjectId(id, 'project ID');
  const projectName = requireNonEmptyString(name, 'project name', 100);
  const realm = getRealmInstance();
  const project = realm.objectForPrimaryKey('Project', projectId);

  if (!project) return null;

  realm.write(() => {
    project.name = projectName;
  });

  return {
    _id: project._id.toString(),
    name: project.name
  };
});

handleIpc('delete-project', async (event, id) => {
  const projectId = getObjectId(id, 'project ID');
  const realm = getRealmInstance();
  const project = realm.objectForPrimaryKey('Project', projectId);

  if (!project) return false;

  realm.write(() => {
    const environments = realm
      .objects('Environment')
      .filtered('project._id == $0', project._id);

    for (const environment of environments) {
      const tokens = realm
        .objects('Token')
        .filtered('environment._id == $0', environment._id);

      realm.delete(tokens);
      realm.delete(environment);
    }

    realm.delete(project);
  });

  return true;
});

// IPC Handlers for Environments
handleIpc('get-environments', async (event, projectId) => {
  const id = getObjectId(projectId, 'project ID');
  const realm = getRealmInstance();
  const project = realm.objectForPrimaryKey('Project', id);

  if (!project) return [];

  const environments = realm
    .objects('Environment')
    .filtered('project._id == $0', project._id);

  return Array.from(environments).map((environment) => ({
    _id: environment._id.toString(),
    type: environment.type,
    projectId: environment.project._id.toString()
  }));
});
handleIpc('get-or-create-environment', async (event, projectId, type) => {
  const id = getObjectId(projectId, 'project ID');
  const environmentType = requireEnvironmentType(type);
  const realm = getRealmInstance();
  const project = realm.objectForPrimaryKey('Project', id);

  if (!project) return null;

  let environment = realm
    .objects('Environment')
    .filtered(
      'project._id == $0 AND type == $1',
      project._id,
      environmentType
    )[0];

  if (!environment) {
    realm.write(() => {
      environment = realm.create('Environment', {
        _id: new Realm.BSON.ObjectId(),
        type: environmentType,
        project
      });
    });
  }

  return {
    _id: environment._id.toString(),
    type: environment.type,
    projectId: environment.project._id.toString()
  };
});

// IPC Handlers for Tokens
// The renderer receives token metadata by default. Plaintext is only returned
// for an explicit reveal/copy/edit action for one token at a time.
function getObjectId(id, fieldName = 'id') {
  return new Realm.BSON.ObjectId(requireObjectIdString(id, fieldName));
}

function toTokenMetadata(token) {
  return {
    _id: token._id.toString(),
    name: token.name,
    service: token.service,
    environmentId: token.environment._id.toString()
  };
}

async function requireMasterKey() {
  const masterKey = await getMasterKey();
  if (typeof masterKey !== 'string' || masterKey.length === 0) {
    throw new Error('CipherVault could not access its encryption key. Check OS keyring access.');
  }
  return masterKey;
}

handleIpc('get-tokens', async (event, environmentId) => {
  const validatedEnvironmentId = getObjectId(environmentId, 'environment ID');
  const realm = getRealmInstance();
  const environment = realm.objectForPrimaryKey('Environment', validatedEnvironmentId);
  if (!environment) return [];

  const tokens = realm.objects('Token').filtered('environment._id == $0', environment._id);
  return Array.from(tokens).map(toTokenMetadata);
});

handleIpc('get-token-value', async (event, tokenId) => {
  const validatedTokenId = getObjectId(tokenId, 'token ID');
  const realm = getRealmInstance();
  const token = realm.objectForPrimaryKey('Token', validatedTokenId);
  if (!token) return null;

  const masterKey = await requireMasterKey();
  const value = decryptToken(token.value, masterKey);
  writeSecureLog('token.revealed', { entity: 'token', outcome: 'success' });
  return { value };
});

handleIpc('copy-token', async (event, tokenId) => {
  const validatedTokenId = getObjectId(tokenId, 'token ID');
  const realm = getRealmInstance();
  const token = realm.objectForPrimaryKey('Token', validatedTokenId);
  if (!token) return false;

  const masterKey = await requireMasterKey();
  const value = decryptToken(token.value, masterKey);
  clipboard.writeText(value);
  scheduleClipboardClear(value);
  writeSecureLog('token.copied', { entity: 'token', outcome: 'success' });
  return true;
});

handleIpc('create-token', async (event, environmentId, tokenData) => {
  const { name, service, value } = requireTokenData(tokenData);
  const validatedEnvironmentId = getObjectId(environmentId, 'environment ID');

  const realm = getRealmInstance();
  const environment = realm.objectForPrimaryKey(
    'Environment',
    validatedEnvironmentId
  );

  if (!environment) return null;

  const masterKey = await requireMasterKey();
  const encryptedValue = encryptToken(value, masterKey);

  let newToken;
  realm.write(() => {
    newToken = realm.create('Token', {
      _id: new Realm.BSON.ObjectId(),
      name,
      service,
      value: encryptedValue,
      environment
    });
  });

  writeSecureLog('token.created', { entity: 'token', outcome: 'success' });
  return toTokenMetadata(newToken);
});

handleIpc('update-token', async (event, tokenId, tokenData) => {
  const { name, service, value } = requireTokenData(tokenData);
  const validatedTokenId = getObjectId(tokenId, 'token ID');

  const realm = getRealmInstance();
  const token = realm.objectForPrimaryKey('Token', validatedTokenId);

  if (!token) return null;

  const masterKey = await requireMasterKey();
  const encryptedValue = encryptToken(value, masterKey);

  realm.write(() => {
    token.name = name;
    token.service = service;
    token.value = encryptedValue;
  });

  writeSecureLog('token.updated', { entity: 'token', outcome: 'success' });
  return toTokenMetadata(token);
});

handleIpc('delete-token', async (event, tokenId) => {
  const validatedTokenId = getObjectId(tokenId, 'token ID');
  const realm = getRealmInstance();
  const token = realm.objectForPrimaryKey('Token', validatedTokenId);
  if (!token) return false;

  realm.write(() => {
    realm.delete(token);
  });
  writeSecureLog('token.deleted', { entity: 'token', outcome: 'success' });
  return true;
});

handleIpc('batch-delete-tokens', async (event, environmentId, tokenIds) => {
  const validatedEnvironmentId = getObjectId(environmentId, 'environment ID');
  const validatedTokenIds = validateBatchDeleteIds(tokenIds);
  const realm = getRealmInstance();
  const environment = realm.objectForPrimaryKey('Environment', validatedEnvironmentId);

  if (!environment) throw new TypeError('Invalid environment ID');

  // Resolve and scope every record before mutating anything. A missing token or
  // token from another environment aborts the entire operation.
  const tokensToDelete = validatedTokenIds.map((tokenId) => {
    const token = realm.objectForPrimaryKey('Token', getObjectId(tokenId, 'token ID'));
    if (!token || token.environment._id.toString() !== environment._id.toString()) {
      throw new TypeError('Invalid token IDs');
    }
    return token;
  });

  realm.write(() => {
    realm.delete(tokensToDelete);
  });

  writeSecureLog('token.batch_deleted', { entity: 'token', outcome: 'success' });
  return tokensToDelete.length;
});


// Keyboard shortcuts are non-secret preferences stored outside the token vault.
const shortcutSettingsPath = () => join(app.getPath('userData'), 'keyboard-shortcuts.json');

async function readKeyboardShortcuts() {
  try {
    const raw = await readFile(shortcutSettingsPath(), 'utf8');
    return validateShortcuts(JSON.parse(raw));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      writeSecureLog('settings.keyboard_shortcuts_read_failed');
    }
    return { ...DEFAULT_SHORTCUTS };
  }
}

handleIpc('get-keyboard-shortcuts', async () => readKeyboardShortcuts());

handleIpc('save-keyboard-shortcuts', async (event, shortcuts) => {
  const validated = validateShortcuts(shortcuts);
  const filePath = shortcutSettingsPath();
  const directory = app.getPath('userData');
  const temporaryPath = `${filePath}.tmp`;
  await mkdir(directory, { recursive: true });
  await writeFile(temporaryPath, JSON.stringify(validated, null, 2), { encoding: 'utf8', mode: 0o600 });
  await rename(temporaryPath, filePath);
  writeSecureLog('settings.keyboard_shortcuts_updated');
  return validated;
});
