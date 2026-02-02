/**
 * useSync Hook
 * Hem Electron hem de Mobile platformlarında senkronizasyon 
 * işlemlerini yürüten merkezi mantık katmanı.
 */

const isElectron = !!(window && window.electronAPI);

export const useSync = () => {

    // Yardımcı: Ayarları Kaydet/Al
    const getSyncConfig = async () => {
        if (isElectron) {
            return await window.electronAPI.syncGetConfig();
        } else {
            const config = localStorage.getItem('sync_config');
            return config ? JSON.parse(config) : { success: true, hostUrl: '', authToken: '' };
        }
    };

    const setSyncConfig = async (config) => {
        if (isElectron) {
            return await window.electronAPI.syncSetConfig(config);
        } else {
            localStorage.setItem('sync_config', JSON.stringify(config));
            return { success: true };
        }
    };

    // Keşif (Sadece Electron'da mDNS var, Mobilde manuel IP)
    const discover = async () => {
        if (isElectron) {
            return await window.electronAPI.syncDiscover();
        }
        return { success: false, error: 'Mobile auto-discovery not supported yet. Use manual IP.' };
    };

    // Bağlantı Testi
    const testConnection = async () => {
        if (isElectron) {
            return await window.electronAPI.syncTestConnection();
        }

        const config = await getSyncConfig();
        if (!config.hostUrl || !config.authToken) return { success: false };

        try {
            const res = await fetch(`${config.hostUrl}/api/health`, {
                headers: { 'Authorization': config.authToken }
            });
            return { success: res.ok };
        } catch (e) {
            return { success: false };
        }
    };

    // Durum Al (Version Code)
    const getStatus = async () => {
        if (isElectron) {
            return await window.electronAPI.syncGetStatus();
        }

        const config = await getSyncConfig();
        try {
            const res = await fetch(`${config.hostUrl}/api/vault/status`, {
                headers: { 'Authorization': config.authToken }
            });
            return await res.json();
        } catch (e) {
            return { success: false };
        }
    };

    // PUSH (Mobilden Host'a)
    const push = async (vaultData) => {
        if (isElectron) {
            return await window.electronAPI.syncPush();
        }

        const config = await getSyncConfig();
        try {
            const res = await fetch(`${config.hostUrl}/api/vault`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': config.authToken
                },
                body: JSON.stringify({ vault: vaultData })
            });
            return await res.json();
        } catch (e) {
            return { success: false, error: e.message };
        }
    };

    // PULL (Host'tan Mobile'e)
    const pull = async () => {
        if (isElectron) {
            return await window.electronAPI.syncPull();
        }

        const config = await getSyncConfig();
        try {
            const res = await fetch(`${config.hostUrl}/api/vault`, {
                headers: { 'Authorization': config.authToken }
            });
            const data = await res.json();
            if (data && data.entries) {
                // Mobilde veriyi kaydet (LocalStorage veya Şifreli Depolama)
                localStorage.setItem('vault_entries', JSON.stringify(data.entries));
                localStorage.setItem('vault_metadata', JSON.stringify(data.metadata || {}));
                return { success: true, versionCode: data.syncMetadata?.versionCode };
            }
            return { success: false };
        } catch (e) {
            return { success: false, error: e.message };
        }
    };

    return {
        isElectron,
        getSyncConfig,
        setSyncConfig,
        discover,
        testConnection,
        getStatus,
        push,
        pull
    };
};
