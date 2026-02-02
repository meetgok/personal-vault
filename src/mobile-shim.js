
// This file runs only on non-Electron environments (like Mobile)
if (!window.electronAPI) {
    console.log("📱 Mobile environment detected. Initializing bridge...");

    // Helper to simulate encryption (simple encoding for demo, since crypto node module isn't available)
    // In production, use a proper JS crypto library
    const simpleEncrypt = (text) => {
        return {
            encrypted: btoa(text),
            iv: 'mobile-iv',
            authTag: 'mobile-tag'
        };
    };

    const simpleDecrypt = (data) => {
        try {
            return atob(data.encrypted);
        } catch (e) {
            return '***';
        }
    };

    window.electronAPI = {
        vaultExists: async () => {
            return !!localStorage.getItem('vault_data');
        },

        initVault: async (password) => {
            const vault = { entries: [], metadata: { created: Date.now() } };
            localStorage.setItem('vault_data', JSON.stringify(vault));
            return true;
        },

        unlockVault: async (password) => {
            // Mobile simple unlock check
            return { success: true };
        },

        getEntries: async () => {
            const data = localStorage.getItem('vault_data');
            if (!data) return [];
            return JSON.parse(data).entries || [];
        },

        addEntry: async (entry) => {
            const data = localStorage.getItem('vault_data');
            const vault = data ? JSON.parse(data) : { entries: [] };

            const encryptedPass = simpleEncrypt(entry.password);

            const newEntry = {
                id: crypto.randomUUID(),
                title: entry.title,
                username: entry.username,
                password: encryptedPass.encrypted, // Flatten for simple storage
                iv: encryptedPass.iv,
                authTag: encryptedPass.authTag,
                createdAt: new Date().toISOString(),
                validity: entry.validity || 'infinite'
            };

            vault.entries.push(newEntry);
            localStorage.setItem('vault_data', JSON.stringify(vault));
            return true;
        },

        deleteEntry: async (id) => {
            const data = localStorage.getItem('vault_data');
            if (!data) return false;
            const vault = JSON.parse(data);
            vault.entries = vault.entries.filter(e => e.id !== id);
            localStorage.setItem('vault_data', JSON.stringify(vault));
            return true;
        },

        updateEntry: async (id, entry) => {
            const data = localStorage.getItem('vault_data');
            if (!data) return false;
            const vault = JSON.parse(data);
            const index = vault.entries.findIndex(e => e.id === id);

            if (index !== -1) {
                const encryptedPass = simpleEncrypt(entry.password);
                vault.entries[index] = {
                    ...vault.entries[index],
                    title: entry.title,
                    username: entry.username,
                    password: encryptedPass.encrypted,
                    iv: encryptedPass.iv,
                    authTag: encryptedPass.authTag,
                    validity: entry.validity || vault.entries[index].validity
                };
                localStorage.setItem('vault_data', JSON.stringify(vault));
                return true;
            }
            return false;
        },

        decryptPassword: async (data) => {
            return simpleDecrypt(data);
        },

        copyText: (text) => {
            // Use native clipboard API
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text);
            }
        },

        clearClipboard: () => {
            // Optional on mobile
        },

        // Sync Stubs
        syncDiscover: async () => ({ success: false, error: "Not supported on mobile" }),
        syncSetConfig: async () => ({ success: true }),
        syncGetConfig: async () => ({ success: false }),
    };
}
