import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Bonjour } from 'bonjour-service';
import { getCurrentVault, getVaultByVersion, listVersions, saveVault, vaultExists } from './version-manager.js';

const app = express();
const PORT = process.env.SYNC_PORT || 3000;
const AUTH_TOKEN = process.env.SYNC_TOKEN || 'change-me-in-production';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Add download route for APK
app.get('/download', (req, res) => {
    const apkPath = path.join(__dirname, 'public', 'personal-vault.apk');
    res.download(apkPath, 'PersonalVault.apk');
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Authentication middleware
function authenticate(req, res, next) {
    const token = req.headers['authorization'];

    if (!token || token !== AUTH_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
}

// Health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'PersonalVault Sync Host',
        version: '1.0.0'
    });
});

// Get current vault
app.get('/api/vault', authenticate, (req, res) => {
    const vault = getCurrentVault();

    if (!vault) {
        return res.status(404).json({ error: 'Vault not found' });
    }

    res.json({
        success: true,
        vault,
        versionCode: vault.syncMetadata?.versionCode || 'unknown'
    });
});

// Upload new vault
app.post('/api/vault', authenticate, (req, res) => {
    const { vault } = req.body;

    if (!vault) {
        return res.status(400).json({ error: 'Vault data required' });
    }

    try {
        const versionCode = saveVault(vault);

        res.json({
            success: true,
            message: 'Vault uploaded successfully',
            versionCode
        });
    } catch (error) {
        console.error('Error saving vault:', error);
        res.status(500).json({ error: 'Failed to save vault' });
    }
});

// Get vault status (version code only)
app.get('/api/vault/status', authenticate, (req, res) => {
    const vault = getCurrentVault();

    if (!vault) {
        return res.status(404).json({ error: 'Vault not found' });
    }

    res.json({
        success: true,
        versionCode: vault.syncMetadata?.versionCode || 'unknown',
        timestamp: vault.syncMetadata?.timestamp || null
    });
});

// List all vault versions
app.get('/api/versions', authenticate, (req, res) => {
    const versions = listVersions();

    res.json({
        success: true,
        versions
    });
});

// Get specific vault version
app.get('/api/version/:index', authenticate, (req, res) => {
    const index = parseInt(req.params.index);

    if (isNaN(index)) {
        return res.status(400).json({ error: 'Invalid version index' });
    }

    const vault = getVaultByVersion(index);

    if (!vault) {
        return res.status(404).json({ error: 'Version not found' });
    }

    res.json({
        success: true,
        vault,
        versionCode: vault.syncMetadata?.versionCode || 'unknown'
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 Personal Vault Sync Host');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔑 Auth token: ${AUTH_TOKEN === 'change-me-in-production' ? '⚠️  DEFAULT (CHANGE IT!)' : '✓ Custom'}`);
    console.log(`📁 Vault exists: ${vaultExists() ? 'Yes' : 'No'}`);

    // Start mDNS service
    const bonjour = new Bonjour();
    bonjour.publish({
        name: 'PersonalVault-Sync',
        type: 'http',
        port: PORT,
        txt: {
            service: 'vault-sync',
            version: '1.0.0'
        }
    });

    console.log('📡 mDNS service broadcasting as "PersonalVault-Sync"');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
