import { Bonjour } from 'bonjour-service';

/**
 * Sync client for communicating with Personal Vault sync host
 */
export class SyncClient {
    constructor() {
        this.hostUrl = null;
        this.authToken = null;
    }

    /**
     * Set sync host configuration
     */
    setConfig(hostUrl, authToken) {
        this.hostUrl = hostUrl;
        this.authToken = authToken;
    }

    /**
     * Discover sync host on local network using mDNS
     * Returns: { name, host, port, url } or null if not found
     */
    async discoverHost(timeoutMs = 5000) {
        return new Promise((resolve) => {
            const bonjour = new Bonjour();
            let found = false;

            const browser = bonjour.find({ type: 'http' });

            browser.on('up', (service) => {
                if (service.name === 'PersonalVault-Sync' && !found) {
                    found = true;
                    browser.stop();

                    const host = service.addresses?.[0] || service.host;
                    const url = `http://${host}:${service.port}`;

                    resolve({
                        name: service.name,
                        host,
                        port: service.port,
                        url
                    });
                }
            });

            // Timeout if not found
            setTimeout(() => {
                if (!found) {
                    browser.stop();
                    resolve(null);
                }
            }, timeoutMs);
        });
    }

    /**
     * Test connection to sync host
     */
    async testConnection() {
        if (!this.hostUrl) {
            throw new Error('Host URL not configured');
        }

        try {
            const response = await fetch(`${this.hostUrl}/api/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Health check failed');
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current vault from host
     */
    async pullVault() {
        if (!this.hostUrl || !this.authToken) {
            throw new Error('Sync not configured');
        }

        const response = await fetch(`${this.hostUrl}/api/vault`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.authToken
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to pull vault');
        }

        const data = await response.json();
        return data.vault;
    }

    /**
     * Upload vault to host
     */
    async pushVault(vault) {
        if (!this.hostUrl || !this.authToken) {
            throw new Error('Sync not configured');
        }

        const response = await fetch(`${this.hostUrl}/api/vault`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.authToken
            },
            body: JSON.stringify({ vault })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to push vault');
        }

        const data = await response.json();
        return data.versionCode;
    }

    /**
     * Get vault status (version code and timestamp)
     */
    async getStatus() {
        if (!this.hostUrl || !this.authToken) {
            throw new Error('Sync not configured');
        }

        const response = await fetch(`${this.hostUrl}/api/vault/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.authToken
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get status');
        }

        return await response.json();
    }

    /**
     * List all available vault versions
     */
    async listVersions() {
        if (!this.hostUrl || !this.authToken) {
            throw new Error('Sync not configured');
        }

        const response = await fetch(`${this.hostUrl}/api/versions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.authToken
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to list versions');
        }

        const data = await response.json();
        return data.versions;
    }
}
