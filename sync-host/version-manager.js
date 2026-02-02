import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const VAULT_FILE = path.join(DATA_DIR, 'vault.json');
const VAULT_V1_FILE = path.join(DATA_DIR, 'vault.v1.json');
const VAULT_V2_FILE = path.join(DATA_DIR, 'vault.v2.json');
const VERSION_COUNTER_FILE = path.join(DATA_DIR, 'version-counter.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize version counter if not exists
if (!fs.existsSync(VERSION_COUNTER_FILE)) {
    fs.writeFileSync(VERSION_COUNTER_FILE, JSON.stringify({ counter: 0 }));
}

/**
 * Get current version counter
 */
function getVersionCounter() {
    const data = fs.readFileSync(VERSION_COUNTER_FILE, 'utf8');
    return JSON.parse(data).counter;
}

/**
 * Increment and get next version counter
 */
function incrementVersionCounter() {
    const counter = getVersionCounter() + 1;
    fs.writeFileSync(VERSION_COUNTER_FILE, JSON.stringify({ counter }));
    return counter;
}

/**
 * Calculate SHA256 hash of data
 */
function calculateHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/**
 * Get current vault with metadata
 */
export function getCurrentVault() {
    if (!fs.existsSync(VAULT_FILE)) {
        return null;
    }

    const data = fs.readFileSync(VAULT_FILE, 'utf8');
    return JSON.parse(data);
}

/**
 * Get vault by version index (0=current, 1=previous, 2=oldest)
 */
export function getVaultByVersion(index) {
    const files = [VAULT_FILE, VAULT_V1_FILE, VAULT_V2_FILE];

    if (index < 0 || index >= files.length) {
        return null;
    }

    const file = files[index];
    if (!fs.existsSync(file)) {
        return null;
    }

    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
}

/**
 * List all available vault versions
 */
export function listVersions() {
    const versions = [];
    const files = [
        { path: VAULT_FILE, label: 'current' },
        { path: VAULT_V1_FILE, label: 'previous' },
        { path: VAULT_V2_FILE, label: 'oldest' }
    ];

    files.forEach((file, index) => {
        if (fs.existsSync(file.path)) {
            const data = JSON.parse(fs.readFileSync(file.path, 'utf8'));
            versions.push({
                index,
                label: file.label,
                versionCode: data.syncMetadata?.versionCode || 'unknown',
                timestamp: data.syncMetadata?.timestamp || null,
                hash: data.syncMetadata?.hash || null
            });
        }
    });

    return versions;
}

/**
 * Save new vault and rotate versions
 * Returns the new version code
 */
export function saveVault(vaultData) {
    // Rotate existing versions
    if (fs.existsSync(VAULT_V1_FILE)) {
        fs.copyFileSync(VAULT_V1_FILE, VAULT_V2_FILE);
    }

    if (fs.existsSync(VAULT_FILE)) {
        fs.copyFileSync(VAULT_FILE, VAULT_V1_FILE);
    }

    // Increment version counter
    const versionCode = incrementVersionCounter();

    // Add sync metadata
    const vaultWithMetadata = {
        ...vaultData,
        syncMetadata: {
            versionCode: `v${versionCode}`,
            timestamp: new Date().toISOString(),
            hash: calculateHash(vaultData)
        }
    };

    // Save new vault
    fs.writeFileSync(VAULT_FILE, JSON.stringify(vaultWithMetadata, null, 2), 'utf8');

    return `v${versionCode}`;
}

/**
 * Check if vault exists
 */
export function vaultExists() {
    return fs.existsSync(VAULT_FILE);
}
