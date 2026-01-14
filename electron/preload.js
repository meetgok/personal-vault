const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    vaultExists: () => ipcRenderer.invoke('vault:exists'),
    initVault: (password) => ipcRenderer.invoke('vault:init', password),
    unlockVault: (password) => ipcRenderer.invoke('vault:unlock', password),
    unlockWithKeychain: () => ipcRenderer.invoke('vault:unlock-keychain'),
    getEntries: () => ipcRenderer.invoke('vault:get-entries'),
    addEntry: (entry) => ipcRenderer.invoke('entries:add', entry),
    decryptPassword: (data) => ipcRenderer.invoke('entries:decrypt', data),
    logout: () => ipcRenderer.invoke('vault:logout')
});
