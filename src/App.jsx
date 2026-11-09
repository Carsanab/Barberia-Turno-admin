import { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem('barberAdmin');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (e) {
        localStorage.removeItem('barberAdmin');
      }
    }
    setLoading(false);
  }, []);

  // Polling para actualizar contador de pendientes en el header
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}?action=getTurnos`);
        const data = await res.json();
        const count = data.filter(t => t.nombre && !t.confirmado).length;
        setPendientes(count);
      } catch (e) {
        console.error(e);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('barberAdmin', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('barberAdmin');
  };

  if (loading) {
    return (
      <div className="loading-app">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Login API_URL={API_URL} onLogin={handleLogin} />;
  }

  return (
    <div className="app admin-app">
      <header className="admin-header">
        <div>
          <h1>🛠️ Panel Admin</h1>
          <p className="user-email">{user.email}</p>
        </div>
        <div className="header-actions">
          {pendientes > 0 && (
            <span className="badge-pendientes-header">
              ⏳ {pendientes}
            </span>
          )}
          <button onClick={handleLogout} className="btn-logout">
            Salir
          </button>
        </div>
      </header>

      <AdminPanel API_URL={API_URL} />
    </div>
  );
}

export default App;