import Realm from 'realm';
import { app } from 'electron';
import { join } from 'path';

// Realm Schema Definitions
const ProjectSchema = {
  name: 'Project',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    name: 'string'
  }
};

const EnvironmentSchema = {
  name: 'Environment',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    type: 'string', // 'Production' or 'Development'
    project: 'Project'
  }
};

const TokenSchema = {
  name: 'Token',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    name: 'string',
    service: 'string',
    value: 'string', // Encrypted token value
    environment: 'Environment'
  }
};

let realmInstance = null;

export async function initRealm() {
  if (realmInstance) {
    return realmInstance;
  }

  const userDataPath = app.getPath('userData');
  const realmPath = join(userDataPath, 'ciphervault.realm');

  const config = {
    path: realmPath,
    schema: [ProjectSchema, EnvironmentSchema, TokenSchema],
    schemaVersion: 1
  };

  try {
    realmInstance = await Realm.open(config);
    console.log('Realm database initialized successfully');
    return realmInstance;
  } catch (error) {
    console.error('Failed to initialize Realm:', error);
    throw error;
  }
}

export function getRealmInstance() {
  if (!realmInstance) {
    throw new Error('Realm instance not initialized. Call initRealm() first.');
  }
  return realmInstance;
}

