import React, { useState, useEffect } from 'react';
import { Search, Plus, LogOut, User, Key, Check, Copy, RefreshCw, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import SyncModal from './SyncModal';

const VaultDashboard = ({ onLogout }) => {
    const [entries, setEntries] = useState([]);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [newEntry, setNewEntry] = useState({ title: '', username: '', password: '', validity: '' });
    const [editingEntry, setEditingEntry] = useState(null);

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        const data = await window.electronAPI.getEntries();
        setEntries(data || []);
    };

    const isExpired = (entry) => {
        if (!entry.createdAt || !entry.validity || entry.validity === 'infinite' || entry.validity === '') return false;

        const createdDate = new Date(entry.createdAt);
        const expiryDate = new Date(createdDate);
        expiryDate.setMonth(expiryDate.getMonth() + parseInt(entry.validity));

        return new Date() > expiryDate;
    };

    const handleAddEntry = async (e) => {
        e.preventDefault();
        const entryToSave = {
            ...newEntry,
            createdAt: new Date().toISOString(),
            validity: newEntry.validity || 'infinite'
        };
        const success = await window.electronAPI.addEntry(entryToSave);
        if (success) {
            toast.success('Kayıt eklendi!');
            setShowAddModal(false);
            setNewEntry({ title: '', username: '', password: '', validity: '' });
            loadEntries();
        }
    };

    const handleDeleteEntry = async (id) => {
        if (window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
            const success = await window.electronAPI.deleteEntry(id);
            if (success) {
                toast.success('Kayıt silindi');
                loadEntries();
            }
        }
    };

    const handleUpdateEntry = async (e) => {
        e.preventDefault();
        const success = await window.electronAPI.updateEntry(editingEntry.id, editingEntry);
        if (success) {
            toast.success('Kayıt güncellendi!');
            setShowEditModal(false);
            setEditingEntry(null);
            loadEntries();
        }
    };

    const copyToClipboard = (text, label) => {
        window.electronAPI.copyText(text);
        toast.success(`${label} kopyalandı!`);

        // Auto-clear clipboard after 30s
        setTimeout(() => {
            window.electronAPI.clearClipboard(text);
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

    const openEditModal = async (entry) => {
        const password = await window.electronAPI.decryptPassword({
            encrypted: entry.password,
            iv: entry.iv,
            authTag: entry.authTag
        });
        setEditingEntry({ ...entry, password });
        setShowEditModal(true);
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
                    <button onClick={() => setShowSyncModal(true)} className="icon-btn sync-btn-header" title="Sync Settings">
                        <RefreshCw size={20} />
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
                            <h3 className={isExpired(entry) ? 'expired-title' : ''}>{entry.title}</h3>
                            <div className="entry-username" onClick={() => copyToClipboard(entry.username, 'Kullanıcı adı')}>
                                <User size={14} />
                                <span>{entry.username}</span>
                            </div>
                        </div>
                        <div className="entry-actions-group">
                            <button onClick={() => handleDecrypt(entry)} className="copy-btn" title="Şifreyi Kopyala">
                                <Key size={16} />
                                <span>****</span>
                            </button>
                            <button onClick={() => openEditModal(entry)} className="item-action-btn edit" title="Düzenle">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteEntry(entry.id)} className="item-action-btn delete" title="Sil">
                                <Trash2 size={16} />
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

            {/* Add Modal */}
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
                            <select
                                className="validity-select"
                                value={newEntry.validity}
                                onChange={e => setNewEntry({ ...newEntry, validity: e.target.value })}
                            >
                                <option value="">Geçerlilik Süresi (Sonsuz)</option>
                                <option value="1">1 Ay</option>
                                <option value="2">2 Ay</option>
                                <option value="3">3 Ay</option>
                                <option value="6">6 Ay</option>
                                <option value="12">12 Ay (1 Yıl)</option>
                                <option value="24">24 Ay (2 Yıl)</option>
                            </select>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowAddModal(false)}>İptal</button>
                                <button type="submit" className="primary-btn">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingEntry && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Kaydı Düzenle</h2>
                        <form onSubmit={handleUpdateEntry}>
                            <input
                                placeholder="Başlık"
                                value={editingEntry.title}
                                onChange={e => setEditingEntry({ ...editingEntry, title: e.target.value })}
                                required
                            />
                            <input
                                placeholder="Kullanıcı Adı"
                                value={editingEntry.username}
                                onChange={e => setEditingEntry({ ...editingEntry, username: e.target.value })}
                                required
                            />
                            <input
                                type="password"
                                placeholder="Yeni Şifre"
                                value={editingEntry.password}
                                onChange={e => setEditingEntry({ ...editingEntry, password: e.target.value })}
                                required
                            />
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowEditModal(false)}>İptal</button>
                                <button type="submit" className="primary-btn">Güncelle</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <SyncModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />
        </div>
    );
};

export default VaultDashboard;
