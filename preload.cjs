const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Project operations
  getProjects: () => ipcRenderer.invoke('get-projects'),
  createProject: (name) => ipcRenderer.invoke('create-project', name),
  updateProject: (id, name) => ipcRenderer.invoke('update-project', id, name),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),
  
  // Environment operations
  getEnvironments: (projectId) => ipcRenderer.invoke('get-environments', projectId),
  getOrCreateEnvironment: (projectId, type) => ipcRenderer.invoke('get-or-create-environment', projectId, type),
  
  // Token operations
  getTokens: (environmentId) => ipcRenderer.invoke('get-tokens', environmentId),
  createToken: (environmentId, tokenData) => ipcRenderer.invoke('create-token', environmentId, tokenData),
  updateToken: (tokenId, tokenData) => ipcRenderer.invoke('update-token', tokenId, tokenData),
  deleteToken: (tokenId) => ipcRenderer.invoke('delete-token', tokenId)
});

