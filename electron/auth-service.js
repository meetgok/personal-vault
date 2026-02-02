import keytar from 'keytar';
import { safeStorage } from 'electron';

const SERVICE_NAME = 'PersonalVault';
const ACCOUNT_NAME = 'MasterKey';

export async function storeKeyInKeychain(key, accountName = 'MasterKey') {
    // We use keytar to store the derived key in the system keychain
    // This allows the user to unlock the vault using TouchID/System Password
    // accountName parameter allows storing different keys (e.g., sync-token, sync-host-url)
    const keyString = typeof key === 'string' ? key : key.toString('hex');
    await keytar.setPassword(SERVICE_NAME, accountName, keyString);
}

export async function getKeyFromKeychain(accountName = 'MasterKey') {
    const value = await keytar.getPassword(SERVICE_NAME, accountName);

    if (!value) {
        return null;
    }

    // If it's a hex string (master key), convert to Buffer
    // Otherwise return as string (for sync config)
    if (accountName === 'MasterKey') {
        return Buffer.from(value, 'hex');
    }

    return value;
}

export async function deleteKeyFromKeychain(accountName = 'MasterKey') {
    await keytar.deletePassword(SERVICE_NAME, accountName);
}

// Note: Electron's safeStorage can also be used for extra encryption 
// but keytar is better for "System Login" integration as requested.
