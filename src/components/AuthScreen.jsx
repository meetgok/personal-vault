import React, { useState, useEffect } from 'react';
import { Lock, Fingerprint, Keyboard } from 'lucide-react';

const AuthScreen = ({ onUnlock }) => {
    const [password, setPassword] = useState('');
    const [vaultExists, setVaultExists] = useState(false);
    const [isNewVault, setIsNewVault] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        window.electronAPI.vaultExists().then((exists) => {
            setVaultExists(exists);
            setLoading(false);

            // Auto-unlock with keychain if possible
            if (exists) {
                window.electronAPI.unlockWithKeychain().then((res) => {
                    if (res.success) onUnlock();
                });
            }
        });
    }, [onUnlock]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password) return;

        if (!vaultExists || isNewVault) {
            const success = await window.electronAPI.initVault(password);
            if (success) onUnlock();
        } else {
            const res = await window.electronAPI.unlockVault(password);
            if (res.success) {
                onUnlock();
            } else {
                alert('Hatalı şifre!');
            }
        }
    };

    if (loading) return null;

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="logo-container">
                    <Lock size={48} className="logo-icon" />
                </div>
                <h2>{vaultExists && !isNewVault ? 'Kasa Kilitli' : 'Yeni Kasa Oluştur'}</h2>
                <p className="subtitle">
                    {vaultExists && !isNewVault
                        ? 'Master Password ile giriş yapın veya Touch ID kullanın.'
                        : 'Kasanızı korumak için güçlü bir şifre belirleyin.'}
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <Keyboard size={20} className="input-icon" />
                        <input
                            type="password"
                            placeholder="Master Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="primary-btn">
                        {vaultExists && !isNewVault ? 'Kasayı Aç' : 'Kasa Oluştur'}
                    </button>
                </form>

                {vaultExists && !isNewVault && (
                    <div className="biometric-hint">
                        <Fingerprint size={24} />
                        <span>Biometrik doğrulama bekleniyor...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthScreen;
