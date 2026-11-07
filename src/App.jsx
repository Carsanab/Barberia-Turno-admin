import { useState } from 'react';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

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
        <button onClick={handleLogout} className="btn-logout">Salir</button>
      </header>

      <AdminPanel API_URL={API_URL} />
    </div>
  );
}

export default App;