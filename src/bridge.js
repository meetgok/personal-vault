/**
 * Platform Bridge
 * Uygulamanın Electron (Masaüstü) veya Capacitor (Mobil) ortamında 
 * doğru API'leri kullanmasını sağlar.
 */

const isElectron = !!(window && window.electronAPI);

export const getPlatformAPI = () => {
    if (isElectron) {
        return window.electronAPI;
    }

    // Capacitor / Mobil API Taklitçisi (Mock/Proxy)
    // Mobilde electronAPI yerine Capacitor plugin'lerini kullanacağız
    return {
        getEntries: async () => {
            const data = localStorage.getItem('vault_data');
            return data ? JSON.parse(data) : [];
        },
        // Buraya mobilde kullanılacak diğer metodlar eklenecek...
        isMobile: true
    };
};

export default getPlatformAPI();
