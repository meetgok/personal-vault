import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { readVault, saveVault, vaultExists } from './storage-service.js';
import { deriveKey, encrypt, decrypt, generateSalt, hashForCheck } from './crypto-service.js';
import { storeKeyInKeychain, getKeyFromKeychain, deleteKeyFromKeychain } from './auth-service.js';

let sessionKey = null;

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
    });

    if (process.env.IS_DEV) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
        win.loadFile(indexPath);
    }
}

// IPC Handlers
ipcMain.handle('vault:exists', () => vaultExists());

ipcMain.handle('vault:init', async (event, password) => {
    const salt = generateSalt();
    const key = deriveKey(password, salt);
    const checkHash = hashForCheck(key);

    const initialVault = {
        metadata: {
            salt,
            check_hash: checkHash
        },
        entries: []
    };

    saveVault(initialVault);
    sessionKey = key;
    return true;
});

ipcMain.handle('vault:unlock', async (event, password) => {
    const vault = readVault();
    if (!vault) return { success: false, error: 'Vault not found' };

    const key = deriveKey(password, vault.metadata.salt);
    const checkHash = hashForCheck(key);

    if (checkHash === vault.metadata.check_hash) {
        sessionKey = key;
        // Optional: store in keychain if user wants
        await storeKeyInKeychain(key);
        return { success: true };
    }

    return { success: false, error: 'Invalid password' };
});

ipcMain.handle('vault:unlock-keychain', async () => {
    const key = await getKeyFromKeychain();
    if (key) {
        sessionKey = key;
        return { success: true };
    }
    return { success: false };
});

ipcMain.handle('vault:get-entries', () => {
    if (!sessionKey) return null;
    const vault = readVault();
    return vault ? vault.entries : [];
});

ipcMain.handle('entries:add', async (event, entry) => {
    if (!sessionKey) return false;
    const vault = readVault();

    const { encrypted, iv, authTag } = encrypt(entry.password, sessionKey);

    const newEntry = {
        id: crypto.randomUUID(),
        title: entry.title,
        username: entry.username,
        password: encrypted,
        iv,
        authTag
    };

    vault.entries.push(newEntry);
    saveVault(vault);
    return true;
});

ipcMain.handle('entries:decrypt', async (event, { encrypted, iv, authTag }) => {
    if (!sessionKey) return null;
    return decrypt(encrypted, sessionKey, iv, authTag);
});

ipcMain.handle('entries:delete', async (event, id) => {
    if (!sessionKey) return false;
    const vault = readVault();
    vault.entries = vault.entries.filter(e => e.id !== id);
    saveVault(vault);
    return true;
});

ipcMain.handle('entries:update', async (event, { id, entry }) => {
    if (!sessionKey) return false;
    const vault = readVault();
    const index = vault.entries.findIndex(e => e.id === id);

    if (index !== -1) {
        const { encrypted, iv, authTag } = encrypt(entry.password, sessionKey);
        vault.entries[index] = {
            ...vault.entries[index],
            title: entry.title,
            username: entry.username,
            password: encrypted,
            iv,
            authTag,
            validity: entry.validity || vault.entries[index].validity
        };
        saveVault(vault);
        return true;
    }
    return false;
});

ipcMain.handle('vault:logout', async () => {
    sessionKey = null;
    await deleteKeyFromKeychain(); // Explicit logout should clear Keychain
    return true;
});

import { clipboard } from 'electron';

ipcMain.on('clipboard:copy', (event, text) => {
    clipboard.writeText(text);
});

ipcMain.on('clipboard:clear', (event, compareText) => {
    if (clipboard.readText() === compareText) {
        clipboard.clear();
    }
});

// Sync functionality
import { SyncClient } from './sync-client.js';
const syncClient = new SyncClient();

// Sync: Discover host on network
ipcMain.handle('sync:discover', async () => {
    try {
        const host = await syncClient.discoverHost();
        return { success: true, host };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Sync: Set configuration (store in Keychain)
ipcMain.handle('sync:set-config', async (event, { hostUrl, authToken }) => {
    try {
        syncClient.setConfig(hostUrl, authToken);

        // Store in Keychain
        await storeKeyInKeychain(authToken, 'sync-token');

        // Store host URL in a separate keychain entry
        await storeKeyInKeychain(hostUrl, 'sync-host-url');

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Sync: Get configuration (from Keychain)
ipcMain.handle('sync:get-config', async () => {
    try {
        const authToken = await getKeyFromKeychain('sync-token');
        const hostUrl = await getKeyFromKeychain('sync-host-url');

        if (authToken && hostUrl) {
            syncClient.setConfig(hostUrl, authToken);
            return { success: true, hostUrl, authToken };
        }

        return { success: false, error: 'No sync config found' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Sync: Test connection
ipcMain.handle('sync:test-connection', async () => {
    try {
        const result = await syncClient.testConnection();
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Sync: Get status (version code)
ipcMain.handle('sync:get-status', async () => {
    try {
        const status = await syncClient.getStatus();
        return { success: true, ...status };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Sync: Pull vault from host
ipcMain.handle('sync:pull', async () => {
    if (!sessionKey) {
        return { success: false, error: 'Vault must be unlocked first' };
    }

    try {
        const remoteVault = await syncClient.pullVault();

        // Save to local storage
        saveVault(remoteVault);

        return {
            success: true,
            versionCode: remoteVault.syncMetadata?.versionCode || 'unknown'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Sync: Push vault to host
ipcMain.handle('sync:push', async () => {
    if (!sessionKey) {
        return { success: false, error: 'Vault must be unlocked first' };
    }

    try {
        const vault = readVault();

        if (!vault) {
            return { success: false, error: 'No vault found' };
        }

        const versionCode = await syncClient.pushVault(vault);

        return { success: true, versionCode };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Sync: List versions
ipcMain.handle('sync:list-versions', async () => {
    try {
        const versions = await syncClient.listVersions();
        return { success: true, versions };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
