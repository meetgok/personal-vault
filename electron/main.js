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
        win.loadFile(path.join(__dirname, '../dist/index.html'));
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

ipcMain.handle('vault:logout', async () => {
    sessionKey = null;
    return true;
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
