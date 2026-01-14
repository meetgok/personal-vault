import keytar from 'keytar';
import { safeStorage } from 'electron';

const SERVICE_NAME = 'PersonalVault';
const ACCOUNT_NAME = 'MasterKey';

export async function storeKeyInKeychain(key) {
    // We use keytar to store the derived key in the system keychain
    // This allows the user to unlock the vault using TouchID/System Password
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, key.toString('hex'));
}

export async function getKeyFromKeychain() {
    const hexKey = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    if (hexKey) {
        return Buffer.from(hexKey, 'hex');
    }
    return null;
}

export async function deleteKeyFromKeychain() {
    await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
}

// Note: Electron's safeStorage can also be used for extra encryption 
// but keytar is better for "System Login" integration as requested.
