import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Realm from 'realm';
import { encryptToken, decryptToken } from '../src/main/crypto-utils.js';

// This test uses a dedicated temporary Realm file and a synthetic test key.
// It never opens or modifies the user's production CipherVault vault/keyring.
test('isolated Realm CRUD lifecycle for project, environment, and encrypted token', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'ciphervault-crud-'));
  let realm;
  const masterKey = 'ciphervault-isolated-crud-test-key-only';
  const schemas = [
    {
      name: 'Project', primaryKey: '_id',
      properties: { _id: 'objectId', name: 'string' }
    },
    {
      name: 'Environment', primaryKey: '_id',
      properties: { _id: 'objectId', type: 'string', project: 'Project' }
    },
    {
      name: 'Token', primaryKey: '_id',
      properties: {
        _id: 'objectId', name: 'string', service: 'string',
        value: 'string', environment: 'Environment'
      }
    }
  ];

  let projectId;
  let environmentId;
  let tokenId;

  try {
    realm = await Realm.open({ path: join(tempDirectory, 'crud-test.realm'), schema: schemas, schemaVersion: 1 });

    // CREATE
    realm.write(() => {
      const project = realm.create('Project', { _id: new Realm.BSON.ObjectId(), name: 'CV CRUD TEST PROJECT' });
      const environment = realm.create('Environment', {
        _id: new Realm.BSON.ObjectId(), type: 'Development', project
      });
      const token = realm.create('Token', {
        _id: new Realm.BSON.ObjectId(), name: 'CV CRUD TEST TOKEN', service: 'Test Service',
        value: encryptToken('cv-test-secret-not-real', masterKey), environment
      });
      projectId = project._id.toString();
      environmentId = environment._id.toString();
      tokenId = token._id.toString();
    });

    // READ
    const project = realm.objectForPrimaryKey('Project', new Realm.BSON.ObjectId(projectId));
    const environment = realm.objectForPrimaryKey('Environment', new Realm.BSON.ObjectId(environmentId));
    const token = realm.objectForPrimaryKey('Token', new Realm.BSON.ObjectId(tokenId));
    assert.equal(project.name, 'CV CRUD TEST PROJECT');
    assert.equal(environment.type, 'Development');
    assert.equal(token.name, 'CV CRUD TEST TOKEN');
    assert.notEqual(token.value, 'cv-test-secret-not-real', 'plaintext must not be stored');
    assert.equal(decryptToken(token.value, masterKey), 'cv-test-secret-not-real');

    // UPDATE
    realm.write(() => {
      project.name = 'CV CRUD TEST PROJECT UPDATED';
      environment.type = 'Production';
      token.name = 'CV CRUD TEST TOKEN UPDATED';
      token.value = encryptToken('cv-test-secret-updated', masterKey);
    });
    assert.equal(realm.objectForPrimaryKey('Project', new Realm.BSON.ObjectId(projectId)).name, 'CV CRUD TEST PROJECT UPDATED');
    assert.equal(realm.objectForPrimaryKey('Environment', new Realm.BSON.ObjectId(environmentId)).type, 'Production');
    const updatedToken = realm.objectForPrimaryKey('Token', new Realm.BSON.ObjectId(tokenId));
    assert.equal(updatedToken.name, 'CV CRUD TEST TOKEN UPDATED');
    assert.equal(decryptToken(updatedToken.value, masterKey), 'cv-test-secret-updated');

    // DELETE in dependency order, mirroring the app's project cascade behavior.
    realm.write(() => {
      const tokenToDelete = realm.objectForPrimaryKey('Token', new Realm.BSON.ObjectId(tokenId));
      const environmentToDelete = realm.objectForPrimaryKey('Environment', new Realm.BSON.ObjectId(environmentId));
      const projectToDelete = realm.objectForPrimaryKey('Project', new Realm.BSON.ObjectId(projectId));
      realm.delete(tokenToDelete);
      realm.delete(environmentToDelete);
      realm.delete(projectToDelete);
    });
    assert.equal(realm.objectForPrimaryKey('Token', new Realm.BSON.ObjectId(tokenId)), null);
    assert.equal(realm.objectForPrimaryKey('Environment', new Realm.BSON.ObjectId(environmentId)), null);
    assert.equal(realm.objectForPrimaryKey('Project', new Realm.BSON.ObjectId(projectId)), null);
  } finally {
    if (realm && !realm.isClosed) realm.close();
    // Remove all temporary test records and Realm files even if an assertion fails.
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
