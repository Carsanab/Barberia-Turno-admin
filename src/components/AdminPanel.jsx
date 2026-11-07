import { useState, useEffect } from 'react';

export default function AdminPanel({ API_URL }) {
  const [turnos, setTurnos] = useState([]);
  const [config, setConfig] = useState({ fechaHasta: '', diasHabilitados: '' });
  const [filter, setFilter] = useState('todos');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [contactModal, setContactModal] = useState(null); // { turno, confirmado }

  useEffect(() => {
    fetchTurnos();
    fetchConfig();
  }, []);

  const fetchTurnos = async () => {
    try {
      const res = await fetch(`${API_URL}?action=getTurnos`);
      const data = await res.json();
      setTurnos(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}?action=getConfig`);
      const data = await res.json();
      setConfig({
        fechaHasta: data.fechaHasta || '',
        diasHabilitados: data.diasHabilitados || ''
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerar = async () => {
    if (!config.fechaHasta || !config.diasHabilitados) {
      setMsg('⚠️ Completá fecha hasta y días habilitados');
      return;
    }

    if (!confirm('¿Generar turnos? Esto borrará los turnos existentes.')) {
      return;
    }

    setLoading(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'updateConfig',
          fechaHasta: config.fechaHasta,
          diasHabilitados: config.diasHabilitados
        })
      });

      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'generarDesdeConfig',
          fechaHasta: config.fechaHasta,
          diasHabilitados: config.diasHabilitados
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setMsg(`✅ ${data.message}`);
        fetchTurnos();
      } else {
        setMsg('❌ ' + data.error);
      }
    } catch (e) {
      setMsg('❌ Error de conexión');
    }
    setLoading(false);
  };

  const handleConfirmar = async (turno) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'confirmar', id: turno.id })
      });
      const data = await res.json();
      
      if (data.success) {
        // Si se confirmó (no se desconfirmó), mostrar modal de contacto
        if (data.confirmado) {
          setContactModal({ turno, confirmado: true });
        }
        fetchTurnos();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleHabilitar = async (id) => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'toggleHabilitar', id })
      });
      fetchTurnos();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelar = async (id) => {
    if (!confirm('¿Cancelar esta reserva?')) return;
    
    try {
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'cancelar', id })
      });
      fetchTurnos();
    } catch (e) {
      console.error(e);
    }
  };

  // Generar mensaje de WhatsApp
  const getWhatsAppMessage = (turno) => {
    const dayName = getDayName(turno.fecha);
    const dateFormatted = formatDate(turno.fecha);
    return `Hola ${turno.nombre}! 👋\n\nTe confirmamos tu turno en *The Barber Cut* ✂️\n\n📅 ${dayName} ${dateFormatted}\n🕐 ${turno.horario}\n\n¡Te esperamos!`;
  };

  // Normalizar número para WhatsApp (agregar código de país si no lo tiene)
  const normalizePhoneForWhatsApp = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    // Si no empieza con código de país, agregar 54 (Argentina) por defecto
    if (cleaned.length <= 10) {
      return `54${cleaned}`;
    }
    return cleaned;
  };

  const handleWhatsApp = () => {
    if (!contactModal) return;
    const phone = normalizePhoneForWhatsApp(contactModal.turno.telefono);
    const message = encodeURIComponent(getWhatsAppMessage(contactModal.turno));
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setContactModal(null);
  };

  const handleCall = () => {
    if (!contactModal) return;
    window.location.href = `tel:${contactModal.turno.telefono}`;
    setContactModal(null);
  };

  const turnosFiltrados = turnos.filter(t => {
    if (filter === 'confirmados') return t.confirmado;
    if (filter === 'pendientes') return t.nombre && !t.confirmado;
    if (filter === 'reservados') return t.nombre;
    if (filter === 'libres') return !t.nombre && t.habilitado;
    return true;
  });

  const agruparPorFecha = () => {
    const grupos = {};
    turnosFiltrados.forEach(t => {
      if (!grupos[t.fecha]) grupos[t.fecha] = [];
      grupos[t.fecha].push(t);
    });
    return grupos;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getDayName = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    const names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return names[date.getDay()];
  };

  const diasSemana = [
    { v: 0, l: 'Dom' }, { v: 1, l: 'Lun' }, { v: 2, l: 'Mar' },
    { v: 3, l: 'Mié' }, { v: 4, l: 'Jue' }, { v: 5, l: 'Vie' }, { v: 6, l: 'Sáb' }
  ];

  const grupos = agruparPorFecha();
  const fechas = Object.keys(grupos).sort();

  return (
    <div className="admin-panel">
      {msg && <div className="msg">{msg}</div>}

      {/* CONFIGURACIÓN */}
      <div className="config-section">
        <h3>⚙️ Generar Turnos</h3>
        
        <div className="config-row">
          <label>
            Fecha hasta:
            <input
              type="date"
              value={config.fechaHasta}
              onChange={e => setConfig({ ...config, fechaHasta: e.target.value })}
            />
          </label>
        </div>

        <div className="config-row">
          <label>Días habilitados:</label>
          <div className="dias-checks">
            {diasSemana.map(d => (
              <label key={d.v} className="dia-check">
                <input
                  type="checkbox"
                  checked={config.diasHabilitados.split(',').map(Number).includes(d.v)}
                  onChange={() => {
                    const arr = config.diasHabilitados.split(',').map(Number);
                    if (arr.includes(d.v)) {
                      setConfig({ ...config, diasHabilitados: arr.filter(x => x !== d.v).join(',') });
                    } else {
                      arr.push(d.v);
                      setConfig({ ...config, diasHabilitados: arr.sort().join(',') });
                    }
                  }}
                />
                {d.l}
              </label>
            ))}
          </div>
        </div>

        <button className="btn-generar" onClick={handleGenerar} disabled={loading}>
          {loading ? 'Generando...' : '🔄 Generar Turnos'}
        </button>
      </div>

      {/* FILTROS */}
      <div className="filters">
        {['todos', 'reservados', 'pendientes', 'confirmados', 'libres'].map(f => (
          <button
            key={f}
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'todos' ? turnos.length : turnosFiltrados.length})
          </button>
        ))}
      </div>

      {/* LISTA DE TURNOS */}
      {fechas.length === 0 ? (
        <p className="no-turnos">No hay turnos para mostrar</p>
      ) : (
        fechas.map(fecha => (
          <div key={fecha} className="admin-dia">
            <h3>{getDayName(fecha)} {formatDate(fecha)}</h3>
            <div className="turnos-table-container">
              <table className="turnos-table">
                <thead>
                  <tr>
                    <th>Horario</th>
                    <th>Cliente</th>
                    <th>Teléfono</th>
                    <th>Confirmado</th>
                    <th>Habilitado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos[fecha].map(t => (
                    <tr key={t.id} className={`${t.nombre ? 'reservado' : ''} ${t.confirmado ? 'confirmado-row' : ''}`}>
                      <td className="horario-cell">{t.horario}</td>
                      <td>{t.nombre || '—'}</td>
                      <td className="telefono-cell">
                        {t.telefono ? (
                          <a href={`tel:${t.telefono}`} className="telefono-link">
                            📞 {t.telefono}
                          </a>
                        ) : '—'}
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={t.confirmado}
                          onChange={() => handleConfirmar(t)}
                          className="checkbox-confirm"
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={t.habilitado}
                          onChange={() => handleToggleHabilitar(t.id)}
                          className="checkbox-habilitar"
                        />
                      </td>
                      <td>
                        {t.nombre && (
                          <button className="btn-cancelar" onClick={() => handleCancelar(t.id)}>
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* MODAL DE CONTACTO */}
      {contactModal && contactModal.confirmado && (
        <div className="modal-overlay" onClick={() => setContactModal(null)}>
          <div className="contact-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-success">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h3>¡Turno Confirmado!</h3>
              <p className="modal-subtitle">¿Querés contactar al cliente?</p>
            </div>

            <div className="modal-client-info">
              <div className="client-detail">
                <span className="detail-label">👤 Cliente</span>
                <span className="detail-value">{contactModal.turno.nombre}</span>
              </div>
              <div className="client-detail">
                <span className="detail-label">📞 Teléfono</span>
                <span className="detail-value">{contactModal.turno.telefono}</span>
              </div>
              <div className="client-detail">
                <span className="detail-label">📅 Turno</span>
                <span className="detail-value">
                  {getDayName(contactModal.turno.fecha)} {formatDate(contactModal.turno.fecha)} a las {contactModal.turno.horario}
                </span>
              </div>
            </div>

            <div className="modal-contact-actions">
              <button className="btn-whatsapp" onClick={handleWhatsApp}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp
              </button>
              <button className="btn-call" onClick={handleCall}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                </svg>
                Llamar
              </button>
            </div>

            <button className="btn-close-modal" onClick={() => setContactModal(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}