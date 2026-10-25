import { requireNonEmptyString, requireObjectIdString, requireEnvironmentType } from './src/main/ipc-validation.js';
import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';
import Realm from 'realm';
import keytar from 'keytar';
import crypto from 'crypto';
import { initRealm, getRealmInstance } from './src/main/realm-config.js';
import { getMasterKey, setMasterKey } from './src/main/keytar-manager.js';
import { encryptToken, decryptToken } from './src/main/crypto-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let realmInstance;


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

  let senderUrl;

  try {
    senderUrl = new URL(frame.url);
  } catch {
    throw new Error('Invalid IPC sender URL');
  }

  const isDev = !app.isPackaged ||
    process.env.NODE_ENV === 'development';

  if (isDev) {
    // Allow only the local Vite development server.
    if (
      senderUrl.protocol !== 'http:' ||
      senderUrl.hostname !== 'localhost' ||
      senderUrl.port !== '5173'
    ) {
      throw new Error('Unauthorized IPC sender URL');
    }

    return;
  }

  // In production, allow only the packaged renderer entry point.
  if (
    senderUrl.protocol !== 'file:' ||
    fileURLToPath(senderUrl) !== resolve(__dirname, 'dist', 'index.html')
  ) {
    throw new Error('Unauthorized IPC sender URL');
  }
}

function handleIpc(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    assertTrustedIpcSender(event);
    return handler(event, ...args);
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
    
    createWindow();
  } catch (error) {
    console.error('Failed to initialize app:', error);
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
      console.log('Icon file not found, using default Electron icon');
    } else {
      console.log('Using custom icon:', iconPath);
    }
  } catch (error) {
    console.log('Could not load custom icon, using default:', error.message);
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
    const allowedDevUrl = !app.isPackaged && targetUrl.startsWith('http://localhost:5173/');
    const allowedPackagedUrl = targetUrl === pathToFileURL(join(__dirname, 'dist', 'index.html')).href;
    if (!allowedDevUrl && !allowedPackagedUrl) event.preventDefault();
  });

  // Show window only when ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  // In development, try to load from Vite dev server, otherwise use built files
  // Check if app is packaged (production build) or if NODE_ENV is explicitly set to development
  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
  
  if (isDev) {
    const devServerUrl = 'http://localhost:5173';
    console.log('Development mode - Loading from dev server:', devServerUrl);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('isPackaged:', app.isPackaged);
    
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
    
    // Handle load failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      if (errorCode === -106 || errorCode === -105) {
        console.error('Failed to load dev server at:', validatedURL);
        console.error('Error code:', errorCode, 'Description:', errorDescription);
        console.error('Make sure Vite dev server is running on port 5173');
        console.error('Run "npm run dev" in a separate terminal, or use "npm run electron:dev"');
      }
    });
  } else {
    const indexPath = join(__dirname, 'dist/index.html');
    console.log('Production mode - Loading from:', indexPath);
    mainWindow.loadFile(indexPath);
  }
}

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
  const realm = getRealmInstance();
  const environment = realm.objectForPrimaryKey('Environment', getObjectId(environmentId, 'environment ID'));
  if (!environment) return [];

  const tokens = realm.objects('Token').filtered('environment._id == $0', environment._id);
  return Array.from(tokens).map(toTokenMetadata);
});

handleIpc('get-token-value', async (event, tokenId) => {
  const realm = getRealmInstance();
  const token = realm.objectForPrimaryKey('Token', getObjectId(tokenId, 'token ID'));
  if (!token) return null;

  const masterKey = await requireMasterKey();
  return { value: decryptToken(token.value, masterKey) };
});

handleIpc('create-token', async (event, environmentId, tokenData) => {
  const realm = getRealmInstance();
  const environment = realm.objectForPrimaryKey('Environment', getObjectId(environmentId, 'environment ID'));
  if (!environment) return null;
  if (!tokenData || typeof tokenData !== 'object' || Array.isArray(tokenData)) {
    throw new TypeError('Invalid token data');
  }

  const name = requireNonEmptyString(tokenData.name, 'token name');
  const service = requireNonEmptyString(tokenData.service, 'service name');
  const value = requireNonEmptyString(tokenData.value, 'token value', 10000);
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
  return toTokenMetadata(newToken);
});

handleIpc('update-token', async (event, tokenId, tokenData) => {
  const realm = getRealmInstance();
  const token = realm.objectForPrimaryKey('Token', getObjectId(tokenId, 'token ID'));
  if (!token) return null;
  if (!tokenData || typeof tokenData !== 'object' || Array.isArray(tokenData)) {
    throw new TypeError('Invalid token data');
  }

  const name = requireNonEmptyString(tokenData.name, 'token name');
  const service = requireNonEmptyString(tokenData.service, 'service name');
  const value = requireNonEmptyString(tokenData.value, 'token value', 10000);
  const masterKey = await requireMasterKey();
  const encryptedValue = encryptToken(value, masterKey);

  realm.write(() => {
    token.name = name;
    token.service = service;
    token.value = encryptedValue;
  });
  return toTokenMetadata(token);
});

handleIpc('delete-token', async (event, tokenId) => {
  const realm = getRealmInstance();
  const token = realm.objectForPrimaryKey('Token', getObjectId(tokenId, 'token ID'));
  if (!token) return false;

  realm.write(() => {
    realm.delete(token);
  });
  return true;
});
