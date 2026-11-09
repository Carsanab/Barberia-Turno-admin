import { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al cargar la app, verificar si hay sesión guardada
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

  const handleLogin = (userData) => {
    setUser(userData);
    // Guardar sesión en localStorage
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
        <button onClick={handleLogout} className="btn-logout">
          Salir
        </button>
      </header>

      <AdminPanel API_URL={API_URL} />
    </div>
  );
}

export default App;