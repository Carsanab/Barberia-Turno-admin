import { useState, useEffect } from 'react';

export default function AdminPanel({ API_URL }) {
  const [turnos, setTurnos] = useState([]);
  const [config, setConfig] = useState({ fechaHasta: '', diasHabilitados: '' });
  const [filter, setFilter] = useState('todos');
  const [loading, setLoading] = useState(false);
  const [contactModal, setContactModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [successModal, setSuccessModal] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeks, setWeeks] = useState([]);
  const [expandedDays, setExpandedDays] = useState({}); // { '2026-11-06': true }
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    fetchTurnos();
    fetchConfig();
  }, []);

  useEffect(() => {
    generateWeeks();
  }, [turnos, weekOffset]);

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

  const generateWeeks = () => {
    if (turnos.length === 0) {
      setWeeks([]);
      return;
    }

    const fechasUnicas = [...new Set(turnos.map(t => t.fecha))].sort();
    const weeksArray = [];
    for (let i = 0; i < fechasUnicas.length; i += 7) {
      weeksArray.push(fechasUnicas.slice(i, i + 7));
    }
    setWeeks(weeksArray);
  };

  // Toggle expandir/colapsar día
  const toggleDay = (fecha) => {
    setExpandedDays(prev => ({
      ...prev,
      [fecha]: !prev[fecha]
    }));
  };

  // Expandir todos los días de la semana actual
  const expandAllWeek = () => {
    const currentWeekFechas = weeks[weekOffset] || [];
    const newExpanded = { ...expandedDays };
    currentWeekFechas.forEach(f => { newExpanded[f] = true; });
    setExpandedDays(newExpanded);
  };

  // Colapsar todos
  const collapseAll = () => {
    setExpandedDays({});
  };

  // Ir a una fecha específica
  const goToDate = (fecha) => {
    setSearchDate(fecha);
    // Buscar en qué semana está esa fecha
    for (let i = 0; i < weeks.length; i++) {
      if (weeks[i].includes(fecha)) {
        setWeekOffset(i);
        // Auto-expandir ese día
        setExpandedDays(prev => ({ ...prev, [fecha]: true }));
        break;
      }
    }
  };

  // Estadísticas
  const stats = {
    total: turnos.length,
    reservados: turnos.filter(t => t.nombre).length,
    pendientes: turnos.filter(t => t.nombre && !t.confirmado).length,
    confirmados: turnos.filter(t => t.confirmado).length,
    libres: turnos.filter(t => !t.nombre && t.habilitado).length
  };

  const handleGenerar = async () => {
    if (!config.fechaHasta || !config.diasHabilitados) {
      setSuccessModal({
        title: '⚠️ Campos incompletos',
        message: 'Completá fecha hasta y días habilitados antes de generar.',
        icon: 'warning'
      });
      return;
    }

    setConfirmModal({
      title: '⚠️ Generar Turnos',
      message: 'Esto borrará TODOS los turnos existentes y generará nuevos. ¿Continuar?',
      icon: 'warning',
      onConfirm: async () => {
        setLoading(true);
        setConfirmModal(null);
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
            setSuccessModal({
              title: '✅ Proceso Completado',
              message: data.message || 'Los turnos se generaron correctamente.',
              icon: 'success'
            });
            fetchTurnos();
          } else {
            setSuccessModal({
              title: '❌ Error',
              message: data.error || 'Ocurrió un error al generar los turnos.',
              icon: 'error'
            });
          }
        } catch (e) {
          setSuccessModal({
            title: '❌ Error de conexión',
            message: 'No se pudo conectar con el servidor.',
            icon: 'error'
          });
        }
        setLoading(false);
      }
    });
  };

  // VALIDACIÓN: No confirmar si no hay info del cliente
  const handleConfirmar = (turno) => {
    // Si ya está confirmado, lo desconfirmamos sin validar
    if (turno.confirmado) {
      confirmarTurnoAPI(turno);
      return;
    }

    // Si no está confirmado, validar que tenga info del cliente
    if (!turno.nombre || !turno.telefono) {
      setSuccessModal({
        title: '⚠️ Información incompleta',
        message: `No se puede confirmar el turno de las ${turno.horario} porque falta información del cliente (nombre y teléfono).`,
        icon: 'warning'
      });
      return;
    }

    setConfirmModal({
      title: '✅ Confirmar Turno',
      message: `¿Confirmar el turno de ${turno.nombre} (${turno.telefono}) del ${formatDate(turno.fecha)} a las ${turno.horario}?`,
      icon: 'confirm',
      onConfirm: async () => {
        setConfirmModal(null);
        await confirmarTurnoAPI(turno);
      }
    });
  };

  const confirmarTurnoAPI = async (turno) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'confirmar', id: turno.id })
      });
      const data = await res.json();
      
      if (data.success) {
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

  const handleCancelar = (turno) => {
    setConfirmModal({
      title: '🗑️ Cancelar Reserva',
      message: `¿Cancelar la reserva de ${turno.nombre} del ${formatDate(turno.fecha)} a las ${turno.horario}?`,
      icon: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'cancelar', id: turno.id })
          });
          setSuccessModal({
            title: '✅ Proceso Completado',
            message: `La reserva de ${turno.nombre} fue cancelada correctamente.`,
            icon: 'success'
          });
          fetchTurnos();
        } catch (e) {
          setSuccessModal({
            title: '❌ Error',
            message: 'No se pudo cancelar la reserva.',
            icon: 'error'
          });
        }
      }
    });
  };

  const handleEliminarDia = (fecha) => {
    const turnosDelDia = turnos.filter(t => t.fecha === fecha);
    const reservados = turnosDelDia.filter(t => t.nombre).length;
    
    setConfirmModal({
      title: '🗑️ Eliminar Día Completo',
      message: `Se eliminarán ${turnosDelDia.length} turnos (${reservados} reservados) del ${formatDate(fecha)}. Esta acción no se puede deshacer.`,
      icon: 'danger',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'eliminarDia', fecha })
          });
          const data = await res.json();
          if (data.success) {
            setSuccessModal({
              title: '✅ Proceso Completado',
              message: `Se eliminaron ${data.eliminados} turnos del ${formatDate(fecha)} correctamente.`,
              icon: 'success'
            });
            fetchTurnos();
          } else {
            setSuccessModal({
              title: '❌ Error',
              message: data.error || 'No se pudo eliminar el día.',
              icon: 'error'
            });
          }
        } catch (e) {
          setSuccessModal({
            title: '❌ Error de conexión',
            message: 'No se pudo conectar con el servidor.',
            icon: 'error'
          });
        }
      }
    });
  };

  const getWhatsAppMessage = (turno) => {
    const dayName = getDayName(turno.fecha);
    const dateFormatted = formatDate(turno.fecha);
    return `Hola ${turno.nombre}! 👋\n\nTe confirmamos tu turno en *The Barber Cut* ✂️\n\n📅 ${dayName} ${dateFormatted}\n🕐 ${turno.horario}\n\n¡Te esperamos!`;
  };

  const normalizePhoneForWhatsApp = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 10) return `54${cleaned}`;
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

  const agruparPorFecha = (listaTurnos) => {
    const grupos = {};
    listaTurnos.forEach(t => {
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

  const getDayNameFull = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return names[date.getDay()];
  };

  const diasSemana = [
    { v: 0, l: 'Dom' }, { v: 1, l: 'Lun' }, { v: 2, l: 'Mar' },
    { v: 3, l: 'Mié' }, { v: 4, l: 'Jue' }, { v: 5, l: 'Vie' }, { v: 6, l: 'Sáb' }
  ];

  const handleWeekChange = (direction) => {
    const newOffset = weekOffset + direction;
    if (newOffset >= 0 && newOffset < weeks.length) {
      setWeekOffset(newOffset);
      setExpandedDays({}); // Colapsar al cambiar de semana
    }
  };

  const currentWeekFechas = weeks[weekOffset] || [];
  const turnosDeLaSemana = turnosFiltrados.filter(t => currentWeekFechas.includes(t.fecha));
  const gruposSemana = agruparPorFecha(turnosDeLaSemana);

  // Obtener info resumida de un día
  const getDaySummary = (fecha) => {
    const turnosDelDia = turnos.filter(t => t.fecha === fecha);
    const reservados = turnosDelDia.filter(t => t.nombre).length;
    const pendientes = turnosDelDia.filter(t => t.nombre && !t.confirmado).length;
    const confirmados = turnosDelDia.filter(t => t.confirmado).length;
    return { total: turnosDelDia.length, reservados, pendientes, confirmados };
  };

  return (
    <div className="admin-panel">
      {/* ESTADÍSTICAS RÁPIDAS */}
      <div className="stats-bar">
        <div className="stat-card stat-total">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card stat-reservados">
          <span className="stat-number">{stats.reservados}</span>
          <span className="stat-label">Reservados</span>
        </div>
        <div className="stat-card stat-pendientes">
          <span className="stat-number">{stats.pendientes}</span>
          <span className="stat-label">⏳ Pendientes</span>
        </div>
        <div className="stat-card stat-confirmados">
          <span className="stat-number">{stats.confirmados}</span>
          <span className="stat-label">✅ Confirmados</span>
        </div>
      </div>

      {/* ALERTA DE PENDIENTES */}
      {stats.pendientes > 0 && (
        <div className="alert-pendientes" onClick={() => setFilter('pendientes')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Tenés <strong>{stats.pendientes} turno{stats.pendientes > 1 ? 's' : ''}</strong> pendiente{stats.pendientes > 1 ? 's' : ''} de confirmar</span>
          <span className="alert-arrow">→</span>
        </div>
      )}

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

      {/* BUSCADOR DE FECHA */}
      <div className="search-section">
        <label>🔍 Ir a fecha específica:</label>
        <input
          type="date"
          value={searchDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={e => {
            setSearchDate(e.target.value);
            if (e.target.value) goToDate(e.target.value);
          }}
          className="search-date-input"
        />
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

      {/* NAVEGACIÓN DE SEMANAS */}
      {weeks.length > 0 && (
        <div className="week-nav-admin">
          <button 
            className="week-nav-btn" 
            onClick={() => handleWeekChange(-1)}
            disabled={weekOffset === 0}
          >
            ← Anterior
          </button>
          <div className="week-actions">
            <span className="week-label">Semana {weekOffset + 1} de {weeks.length}</span>
            <div className="week-buttons">
              <button className="btn-small" onClick={expandAllWeek}>Expandir todo</button>
              <button className="btn-small" onClick={collapseAll}>Colapsar todo</button>
            </div>
          </div>
          <button 
            className="week-nav-btn" 
            onClick={() => handleWeekChange(1)}
            disabled={weekOffset >= weeks.length - 1}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* DÍAS COMO ACORDEÓN */}
      {currentWeekFechas.length === 0 ? (
        <p className="no-turnos">No hay turnos para mostrar</p>
      ) : (
        currentWeekFechas.map(fecha => {
          const turnosDelDia = gruposSemana[fecha] || [];
          if (turnosDelDia.length === 0) return null;
          
          const summary = getDaySummary(fecha);
          const isExpanded = expandedDays[fecha] || false;
          const hasPendientes = summary.pendientes > 0;

          return (
            <div key={fecha} className={`day-accordion ${isExpanded ? 'expanded' : ''} ${hasPendientes ? 'has-pendientes' : ''}`}>
              {/* HEADER DEL DÍA (clickable) */}
              <div className="day-header" onClick={() => toggleDay(fecha)}>
                <div className="day-header-left">
                  <svg 
                    className={`chevron ${isExpanded ? 'rotated' : ''}`}
                    width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                  <div className="day-title">
                    <h3>{getDayNameFull(fecha)} {formatDate(fecha)}</h3>
                    <div className="day-badges">
                      <span className="badge badge-total">{summary.total} turnos</span>
                      {summary.reservados > 0 && (
                        <span className="badge badge-reservados">{summary.reservados} reservados</span>
                      )}
                      {summary.confirmados > 0 && (
                        <span className="badge badge-confirmados">{summary.confirmados} confirmados</span>
                      )}
                      {hasPendientes && (
                        <span className="badge badge-pendientes">⏳ {summary.pendientes} pendientes</span>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  className="btn-eliminar-dia"
                  onClick={(e) => { e.stopPropagation(); handleEliminarDia(fecha); }}
                  title="Eliminar todos los turnos de este día"
                >
                  🗑️
                </button>
              </div>

              {/* CONTENIDO EXPANDIBLE */}
              {isExpanded && (
                <div className="day-content">
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
                        {turnosDelDia.map(t => (
                          <tr 
                            key={t.id} 
                            className={`
                              ${t.nombre ? 'reservado' : ''} 
                              ${t.confirmado ? 'confirmado-row' : ''}
                              ${t.nombre && !t.confirmado ? 'pendiente-row' : ''}
                              ${!t.nombre && !t.telefono ? 'incomplete-row' : ''}
                            `}
                          >
                            <td className="horario-cell" data-label="Horario">
                              {t.horario}
                            </td>
                            <td data-label="Cliente">
                              {t.nombre || <span className="empty-text">—</span>}
                            </td>
                            <td className="telefono-cell" data-label="Teléfono">
                              {t.telefono ? (
                                <a href={`tel:${t.telefono}`} className="telefono-link">
                                  📞 {t.telefono}
                                </a>
                              ) : <span className="empty-text">—</span>}
                            </td>
                            <td data-label="Confirmado">
                              <input
                                type="checkbox"
                                checked={t.confirmado}
                                onChange={() => handleConfirmar(t)}
                                className="checkbox-confirm"
                                title={!t.nombre || !t.telefono ? 'Falta info del cliente' : ''}
                              />
                            </td>
                            <td data-label="Habilitado">
                              <input
                                type="checkbox"
                                checked={t.habilitado}
                                onChange={() => handleToggleHabilitar(t.id)}
                                className="checkbox-habilitar"
                              />
                            </td>
                            <td data-label="Acciones">
                              {t.nombre && (
                                <button className="btn-cancelar" onClick={() => handleCancelar(t)}>
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
              )}
            </div>
          );
        })
      )}

      {/* MODAL DE ÉXITO / ERROR */}
      {successModal && (
        <div className="modal-overlay" onClick={() => setSuccessModal(null)}>
          <div className="success-modal" onClick={e => e.stopPropagation()}>
            <div className={`success-icon-container ${successModal.icon}`}>
              {successModal.icon === 'success' && (
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              )}
              {successModal.icon === 'warning' && (
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              )}
              {successModal.icon === 'error' && (
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              )}
            </div>
            <h3>{successModal.title}</h3>
            <p className="success-message">{successModal.message}</p>
            <button className="btn-success-close" onClick={() => setSuccessModal(null)}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className={`modal-icon-container ${confirmModal.icon}`}>
              {confirmModal.icon === 'warning' && (
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              )}
              {confirmModal.icon === 'delete' && (
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#e94560" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              )}
              {confirmModal.icon === 'danger' && (
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              )}
              {confirmModal.icon === 'confirm' && (
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              )}
            </div>
            <h3>{confirmModal.title}</h3>
            <p className="modal-message">{confirmModal.message}</p>
            <div className="modal-actions-confirm">
              <button className="btn-modal-cancel" onClick={() => setConfirmModal(null)}>
                Cancelar
              </button>
              <button 
                className={`btn-modal-confirm ${confirmModal.icon}`} 
                onClick={confirmModal.onConfirm}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
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