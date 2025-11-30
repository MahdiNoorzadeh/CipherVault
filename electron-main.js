import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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

// Initialize Realm and master key on app startup
app.whenReady().then(async () => {
  try {
    // Ensure master key exists
    let masterKey = await getMasterKey();
    if (!masterKey) {
      masterKey = crypto.randomBytes(32).toString('hex');
      await setMasterKey(masterKey);
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
ipcMain.handle('get-projects', async () => {
  const realm = getRealmInstance();
  const projects = realm.objects('Project');
  return Array.from(projects).map(p => ({ _id: p._id.toString(), name: p.name }));
});

ipcMain.handle('create-project', async (event, name) => {
  const realm = getRealmInstance();
  realm.write(() => {
    realm.create('Project', {
      _id: new Realm.BSON.ObjectId(),
      name: name
    });
  });
  const projects = realm.objects('Project');
  return Array.from(projects).map(p => ({ _id: p._id.toString(), name: p.name }));
});

ipcMain.handle('update-project', async (event, id, name) => {
  const realm = getRealmInstance();
  const project = realm.objectForPrimaryKey('Project', new Realm.BSON.ObjectId(id));
  if (project) {
    realm.write(() => {
      project.name = name;
    });
    return { _id: project._id.toString(), name: project.name };
  }
  return null;
});

ipcMain.handle('delete-project', async (event, id) => {
  const realm = getRealmInstance();
  const project = realm.objectForPrimaryKey('Project', new Realm.BSON.ObjectId(id));
  if (project) {
    realm.write(() => {
      // Delete associated environments and tokens
      const environments = realm.objects('Environment').filtered('project._id == $0', project._id);
      environments.forEach(env => {
        const tokens = realm.objects('Token').filtered('environment._id == $0', env._id);
        realm.delete(tokens);
        realm.delete(env);
      });
      realm.delete(project);
    });
    return true;
  }
  return false;
});

// IPC Handlers for Environments
ipcMain.handle('get-environments', async (event, projectId) => {
  const realm = getRealmInstance();
  const project = realm.objectForPrimaryKey('Project', new Realm.BSON.ObjectId(projectId));
  if (!project) return [];
  
  const environments = realm.objects('Environment').filtered('project._id == $0', project._id);
  return Array.from(environments).map(e => ({
    _id: e._id.toString(),
    type: e.type,
    projectId: e.project._id.toString()
  }));
});

ipcMain.handle('get-or-create-environment', async (event, projectId, type) => {
  const realm = getRealmInstance();
  const project = realm.objectForPrimaryKey('Project', new Realm.BSON.ObjectId(projectId));
  if (!project) return null;
  
  let environment = realm.objects('Environment').filtered('project._id == $0 AND type == $1', project._id, type)[0];
  
  if (!environment) {
    realm.write(() => {
      environment = realm.create('Environment', {
        _id: new Realm.BSON.ObjectId(),
        type: type,
        project: project
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
ipcMain.handle('get-tokens', async (event, environmentId) => {
  const realm = getRealmInstance();
  const environment = realm.objectForPrimaryKey('Environment', new Realm.BSON.ObjectId(environmentId));
  if (!environment) return [];
  
  const tokens = realm.objects('Token').filtered('environment._id == $0', environment._id);
  const masterKey = await getMasterKey();
  
  return Array.from(tokens).map(t => ({
    _id: t._id.toString(),
    name: t.name,
    service: t.service,
    value: decryptToken(t.value, masterKey),
    environmentId: t.environment._id.toString()
  }));
});

ipcMain.handle('create-token', async (event, environmentId, tokenData) => {
  const realm = getRealmInstance();
  const environment = realm.objectForPrimaryKey('Environment', new Realm.BSON.ObjectId(environmentId));
  if (!environment) return null;
  
  const masterKey = await getMasterKey();
  const encryptedValue = encryptToken(tokenData.value, masterKey);
  
  let newToken;
  realm.write(() => {
    newToken = realm.create('Token', {
      _id: new Realm.BSON.ObjectId(),
      name: tokenData.name,
      service: tokenData.service,
      value: encryptedValue,
      environment: environment
    });
  });
  
  return {
    _id: newToken._id.toString(),
    name: newToken.name,
    service: newToken.service,
    value: tokenData.value,
    environmentId: newToken.environment._id.toString()
  };
});

ipcMain.handle('update-token', async (event, tokenId, tokenData) => {
  const realm = getRealmInstance();
  const token = realm.objectForPrimaryKey('Token', new Realm.BSON.ObjectId(tokenId));
  if (!token) return null;
  
  const masterKey = await getMasterKey();
  const encryptedValue = encryptToken(tokenData.value, masterKey);
  
  realm.write(() => {
    token.name = tokenData.name;
    token.service = tokenData.service;
    token.value = encryptedValue;
  });
  
  return {
    _id: token._id.toString(),
    name: token.name,
    service: token.service,
    value: tokenData.value,
    environmentId: token.environment._id.toString()
  };
});

ipcMain.handle('delete-token', async (event, tokenId) => {
  const realm = getRealmInstance();
  const token = realm.objectForPrimaryKey('Token', new Realm.BSON.ObjectId(tokenId));
  if (!token) return false;
  
  realm.write(() => {
    realm.delete(token);
  });
  
  return true;
});

