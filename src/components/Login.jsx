import { useState } from 'react';

export default function Login({ API_URL, onLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Ingresá tu correo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}?action=verificarAdmin&email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (data.esAdmin) {
        onLogin({ email, rol: 'admin' });
      } else {
        setError('Este correo no tiene permisos de administrador');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>✂️ THE BARBER</h1>
        <p className="subtitle">Panel de Administración</p>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Correo de administrador</label>
            <input
              id="email"
              type="email"
              placeholder="admin@barber.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" disabled={loading} className="btn-login">
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        <p className="login-hint">
          Tu sesión se guardará automáticamente
        </p>
      </div>
    </div>
  );
}