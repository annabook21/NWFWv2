const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  newDiagram: () => ipcRenderer.send('new-diagram'),
  saveDiagram: () => ipcRenderer.send('save-diagram'),
  
  // Template loading
  loadTemplate: (template) => ipcRenderer.send('load-template', template),
  
  // About dialog
  showAbout: () => ipcRenderer.send('show-about'),
  
  // Listen for responses
  onNewDiagram: (callback) => ipcRenderer.on('new-diagram-response', callback),
  onSaveDiagram: (callback) => ipcRenderer.on('save-diagram-response', callback),
  onLoadTemplate: (callback) => ipcRenderer.on('load-template-response', callback),
  onShowAbout: (callback) => ipcRenderer.on('show-about-response', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Handle window controls
window.addEventListener('DOMContentLoaded', () => {
  // Add any initialization code here if needed
  console.log('Preload script loaded successfully');
}); 