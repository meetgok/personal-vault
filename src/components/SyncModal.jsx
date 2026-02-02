import { useState, useEffect } from 'react';
import { X, Wifi, WifiOff, Download, Upload, Settings, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSync } from '../hooks/useSync';

export default function SyncModal({ isOpen, onClose }) {
    const sync = useSync();
    const [syncConfig, setSyncConfig] = useState({ hostUrl: '', authToken: '' });
    const [isConnected, setIsConnected] = useState(false);
    const [versionCode, setVersionCode] = useState(null);
    const [lastSync, setLastSync] = useState(null);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showConfig, setShowConfig] = useState(false);

    // Load saved config on mount
    useEffect(() => {
        if (isOpen) {
            loadConfig();
        }
    }, [isOpen]);

    const loadConfig = async () => {
        const result = await sync.getSyncConfig();
        if (result && result.success) {
            setSyncConfig({
                hostUrl: result.hostUrl || '',
                authToken: result.authToken || ''
            });
            // Try to connect once we have config
            if (result.hostUrl && result.authToken) {
                testConnection(result.hostUrl, result.authToken);
            }
        }
    };

    const testConnection = async (hostUrl, authToken) => {
        if (!hostUrl || !authToken) return;

        // Before testing, make sure we update the config state if it's different
        await sync.setSyncConfig({ hostUrl, authToken });

        const result = await sync.testConnection();
        if (result.success) {
            setIsConnected(true);
            fetchStatus();
        } else {
            setIsConnected(false);
        }
    };

    const fetchStatus = async () => {
        const result = await sync.getStatus();
        if (result.success) {
            setVersionCode(result.versionCode);
            setLastSync(result.timestamp ? new Date(result.timestamp) : null);
        }
    };

    const handleDiscover = async () => {
        if (!sync.isElectron) {
            toast.error('Auto-discovery is only available on Desktop. Please enter IP manually.');
            return;
        }
        setIsDiscovering(true);
        toast.loading('Searching for sync host...', { id: 'discover' });

        const result = await sync.discover();
        setIsDiscovering(false);

        if (result.success && result.host) {
            toast.success(`Found host at ${result.host.url}`, { id: 'discover' });
            setSyncConfig(prev => ({ ...prev, hostUrl: result.host.url }));
        } else {
            toast.error('No sync host found on network', { id: 'discover' });
        }
    };

    const handleSaveConfig = async () => {
        if (!syncConfig.hostUrl || !syncConfig.authToken) {
            toast.error('Please enter both host URL and auth token');
            return;
        }

        const result = await sync.setSyncConfig(syncConfig);
        if (result.success) {
            toast.success('Sync configuration saved');
            setShowConfig(false);
            testConnection(syncConfig.hostUrl, syncConfig.authToken);
        } else {
            toast.error('Failed to save configuration');
        }
    };

    const handlePull = async () => {
        if (!isConnected) {
            toast.error('Not connected to sync host');
            return;
        }

        const confirmed = window.confirm(
            '⚠️ This will replace your local vault with the remote version. Continue?'
        );

        if (!confirmed) return;

        setIsSyncing(true);
        toast.loading('Pulling vault from host...', { id: 'pull' });

        const result = await sync.pull();
        setIsSyncing(false);

        if (result.success) {
            toast.success(`Vault updated to ${result.versionCode}`, { id: 'pull' });
            setVersionCode(result.versionCode);
            // Refresh to show updated data
            window.location.reload();
        } else {
            toast.error(result.error || 'Failed to pull vault', { id: 'pull' });
        }
    };

    const handlePush = async () => {
        if (!isConnected) {
            toast.error('Not connected to sync host');
            return;
        }

        setIsSyncing(true);
        toast.loading('Pushing vault to host...', { id: 'push' });

        // On mobile, we need to pass the actual vault data from storage
        let vaultData = null;
        if (!sync.isElectron) {
            const entries = localStorage.getItem('vault_entries');
            const metadata = localStorage.getItem('vault_metadata');
            vaultData = {
                entries: entries ? JSON.parse(entries) : [],
                metadata: metadata ? JSON.parse(metadata) : {}
            };
        }

        const result = await sync.push(vaultData);
        setIsSyncing(false);

        if (result.success) {
            toast.success(`Vault pushed as ${result.versionCode}`, { id: 'push' });
            setVersionCode(result.versionCode);
            fetchStatus();
        } else {
            toast.error(result.error || 'Failed to push vault', { id: 'push' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content sync-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🔄 Sync Settings</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Connection Status */}
                    <div className={`sync-status ${isConnected ? 'connected' : 'disconnected'}`}>
                        {isConnected ? (
                            <>
                                <Wifi size={20} />
                                <span>Connected</span>
                            </>
                        ) : (
                            <>
                                <WifiOff size={20} />
                                <span>Not Connected</span>
                            </>
                        )}
                    </div>

                    {/* Version Info */}
                    {isConnected && versionCode && (
                        <div className="version-info">
                            <div className="version-badge">{versionCode}</div>
                            {lastSync && (
                                <div className="last-sync">
                                    Last sync: {lastSync.toLocaleString()}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sync Actions */}
                    <div className="sync-actions">
                        <button
                            className="sync-btn discover-btn"
                            onClick={handleDiscover}
                            disabled={isDiscovering || isSyncing}
                        >
                            <RefreshCw size={18} className={isDiscovering ? 'spinning' : ''} />
                            Discover Host
                        </button>

                        <button
                            className="sync-btn pull-btn"
                            onClick={handlePull}
                            disabled={!isConnected || isSyncing}
                        >
                            <Download size={18} />
                            Pull from Host
                        </button>

                        <button
                            className="sync-btn push-btn"
                            onClick={handlePush}
                            disabled={!isConnected || isSyncing}
                        >
                            <Upload size={18} />
                            Push to Host
                        </button>
                    </div>

                    {/* Configuration Section */}
                    <div className="config-section">
                        <button
                            className="config-toggle"
                            onClick={() => setShowConfig(!showConfig)}
                        >
                            <Settings size={16} />
                            {showConfig ? 'Hide' : 'Show'} Configuration
                        </button>

                        {showConfig && (
                            <div className="config-form">
                                <div className="form-group">
                                    <label>Host URL</label>
                                    <input
                                        type="text"
                                        placeholder="http://192.168.1.5:3000"
                                        value={syncConfig.hostUrl}
                                        onChange={(e) => setSyncConfig(prev => ({ ...prev, hostUrl: e.target.value }))}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Auth Token</label>
                                    <input
                                        type="password"
                                        placeholder="Enter sync token"
                                        value={syncConfig.authToken}
                                        onChange={(e) => setSyncConfig(prev => ({ ...prev, authToken: e.target.value }))}
                                    />
                                </div>

                                <button className="save-config-btn" onClick={handleSaveConfig}>
                                    Save Configuration
                                </button>

                                <div className="config-note">
                                    <AlertCircle size={14} />
                                    <span>
                                        Configured for {sync.isElectron ? 'macOS Keychain' : 'Local Secure Storage'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
