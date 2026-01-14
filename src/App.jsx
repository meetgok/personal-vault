import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import AuthScreen from './components/AuthScreen'
import VaultDashboard from './components/VaultDashboard'
import './App.css'

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const handleLogout = async () => {
        await window.electronAPI.logout();
        setIsAuthenticated(false);
    };

    return (
        <div className="app-container">
            <Toaster position="top-right" />
            {!isAuthenticated ? (
                <AuthScreen onUnlock={() => setIsAuthenticated(true)} />
            ) : (
                <VaultDashboard onLogout={handleLogout} />
            )}
        </div>
    )
}

export default App
