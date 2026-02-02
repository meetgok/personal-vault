# Personal Vault Sync Host

Local network synchronization server for Personal Vault. Allows secure vault syncing between devices on the same WiFi network.

## Features

- 🔒 **Token-based authentication** - Secure access control
- 📦 **3-version history** - Automatic version rotation (current + 2 previous)
- 🔢 **Incremental version codes** - Track vault changes (v1, v2, v3...)
- 📡 **mDNS auto-discovery** - Clients can find the server automatically
- 🚀 **REST API** - Simple HTTP endpoints for sync operations

## Quick Start

### 1. Start the Server

```bash
cd sync-host
chmod +x start.sh
./start.sh
```

The first run will:

- Install dependencies automatically
- Generate a random authentication token
- Create a `.env` file with your configuration
- Display your auth token (save it!)

### 2. Server Endpoints

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/api/health` | GET | Health check (no auth) |
| `/api/vault` | GET | Get current vault |
| `/api/vault` | POST | Upload new vault |
| `/api/vault/status` | GET | Get version code only |
| `/api/versions` | GET | List all versions |
| `/api/version/:index` | GET | Get specific version (0=current, 1=previous, 2=oldest) |

### 3. Authentication

All endpoints (except `/api/health`) require the `Authorization` header:

```bash
curl -H "Authorization: your-token-here" http://localhost:3000/api/vault
```

## Configuration

Edit `.env` file to customize:

```env
SYNC_PORT=3000
SYNC_TOKEN=your-secret-token-here
```

## Version Management

The server maintains 3 vault versions:

```text
sync-host/data/
├── vault.json       # Current version (v42)
├── vault.v1.json    # Previous version (v41)
└── vault.v2.json    # Oldest version (v40)
```

### Manual Rollback

To restore a previous version:

```bash
cd sync-host/data
cp vault.v1.json vault.json  # Restore previous version
```

## Vault Metadata

Each vault includes sync metadata:

```json
{
  "metadata": { ... },
  "entries": [ ... ],
  "syncMetadata": {
    "versionCode": "v42",
    "timestamp": "2026-02-02T12:25:00.000Z",
    "hash": "abc123..."
  }
}
```

## Security Notes

- ⚠️ **Change the default token** - Never use the default token in production
- 🔒 **Local network only** - Server binds to `0.0.0.0` but should only be accessible on your LAN
- 🔑 **Keep token secure** - Store it in macOS Keychain on clients
- 📱 **Share carefully** - Only share the token with your own devices

## Troubleshooting

### Server won't start

```bash
# Check if port 3000 is already in use
lsof -i :3000

# Use a different port
SYNC_PORT=3001 npm start
```

### Can't connect from client

```bash
# Find your Mac's local IP
ipconfig getifaddr en0

# Test connection
curl http://YOUR_IP:3000/api/health
```

### mDNS not working

- Ensure both devices are on the same WiFi network
- Check firewall settings
- Use manual IP entry as fallback

## Development

```bash
# Install dependencies
npm install

# Start with auto-reload
npm run dev

# Manual start
SYNC_TOKEN="test123" npm start
```
