const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    vaultExists: () => ipcRenderer.invoke('vault:exists'),
    initVault: (password) => ipcRenderer.invoke('vault:init', password),
    unlockVault: (password) => ipcRenderer.invoke('vault:unlock', password),
    unlockWithKeychain: () => ipcRenderer.invoke('vault:unlock-keychain'),
    getEntries: () => ipcRenderer.invoke('vault:get-entries'),
    addEntry: (entry) => ipcRenderer.invoke('entries:add', entry),
    deleteEntry: (id) => ipcRenderer.invoke('entries:delete', id),
    updateEntry: (id, entry) => ipcRenderer.invoke('entries:update', { id, entry }),
    decryptPassword: (data) => ipcRenderer.invoke('entries:decrypt', data),
    logout: () => ipcRenderer.invoke('vault:logout'),
    copyText: (text) => ipcRenderer.send('clipboard:copy', text),
    clearClipboard: (compareText) => ipcRenderer.send('clipboard:clear', compareText),

    // Sync API
    syncDiscover: () => ipcRenderer.invoke('sync:discover'),
    syncSetConfig: (config) => ipcRenderer.invoke('sync:set-config', config),
    syncGetConfig: () => ipcRenderer.invoke('sync:get-config'),
    syncTestConnection: () => ipcRenderer.invoke('sync:test-connection'),
    syncGetStatus: () => ipcRenderer.invoke('sync:get-status'),
    syncPull: () => ipcRenderer.invoke('sync:pull'),
    syncPush: () => ipcRenderer.invoke('sync:push'),
    syncListVersions: () => ipcRenderer.invoke('sync:list-versions')
});
