import React, { useState, useEffect } from 'react';
import { Search, Plus, LogOut, User, Key, Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const VaultDashboard = ({ onLogout }) => {
    const [entries, setEntries] = useState([]);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEntry, setNewEntry] = useState({ title: '', username: '', password: '' });

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        const data = await window.electronAPI.getEntries();
        setEntries(data || []);
    };

    const handleAddEntry = async (e) => {
        e.preventDefault();
        const success = await window.electronAPI.addEntry(newEntry);
        if (success) {
            toast.success('Kayıt eklendi!');
            setShowAddModal(false);
            setNewEntry({ title: '', username: '', password: '' });
            loadEntries();
        }
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} kopyalandı!`);

        // Auto-clear clipboard after 30s
        setTimeout(() => {
            navigator.clipboard.readText().then(current => {
                if (current === text) {
                    navigator.clipboard.writeText('');
                    toast('Pano temizlendi', { icon: '🧹' });
                }
            });
        }, 30000);
    };

    const handleDecrypt = async (entry) => {
        const password = await window.electronAPI.decryptPassword({
            encrypted: entry.password,
            iv: entry.iv,
            authTag: entry.authTag
        });
        copyToClipboard(password, 'Şifre');
    };

    const filteredEntries = entries.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.username.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="search-bar">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Kasalarda ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="header-actions">
                    <button onClick={() => setShowAddModal(true)} className="icon-btn primary">
                        <Plus size={20} />
                    </button>
                    <button onClick={onLogout} className="icon-btn">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="entry-list">
                {filteredEntries.map(entry => (
                    <div key={entry.id} className="entry-card">
                        <div className="entry-info">
                            <h3>{entry.title}</h3>
                            <div className="entry-username" onClick={() => copyToClipboard(entry.username, 'Kullanıcı adı')}>
                                <User size={14} />
                                <span>{entry.username}</span>
                            </div>
                        </div>
                        <div className="entry-actions">
                            <button onClick={() => handleDecrypt(entry)} className="copy-btn">
                                <Key size={16} />
                                <span>****</span>
                            </button>
                        </div>
                    </div>
                ))}
                {filteredEntries.length === 0 && (
                    <div className="empty-state">
                        <p>Kayıt bulunamadı.</p>
                    </div>
                )}
            </main>

            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Yeni Kayıt</h2>
                        <form onSubmit={handleAddEntry}>
                            <input
                                placeholder="Başlık (Örn: Netflix)"
                                value={newEntry.title}
                                onChange={e => setNewEntry({ ...newEntry, title: e.target.value })}
                                required
                            />
                            <input
                                placeholder="Kullanıcı Adı"
                                value={newEntry.username}
                                onChange={e => setNewEntry({ ...newEntry, username: e.target.value })}
                                required
                            />
                            <input
                                type="password"
                                placeholder="Şifre"
                                value={newEntry.password}
                                onChange={e => setNewEntry({ ...newEntry, password: e.target.value })}
                                required
                            />
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowAddModal(false)}>İptal</button>
                                <button type="submit" className="primary-btn">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VaultDashboard;
