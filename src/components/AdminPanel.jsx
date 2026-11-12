import { useState, useEffect } from 'react';

export default function AdminPanel({ API_URL }) {
  const [activeTab, setActiveTab] = useState('turnos');
  
  const [turnos, setTurnos] = useState([]);
  const [config, setConfig] = useState({ fechaHasta: '', diasHabilitados: '' });
  const [filter, setFilter] = useState('todos');
  const [loading, setLoading] = useState(false);
  const [contactModal, setContactModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [successModal, setSuccessModal] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeks, setWeeks] = useState([]);
  const [expandedDays, setExpandedDays] = useState({});
  const [searchDate, setSearchDate] = useState('');
  const [lastTurnosCount, setLastTurnosCount] = useState(0);
  const [newReservationToast, setNewReservationToast] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [servicios, setServicios] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [newService, setNewService] = useState({ nombre: '', duracion: '', precio: '' });
  const [newBarber, setNewBarber] = useState({ nombre: '', especialidad: '', fotoUrl: '' });

  const [editingBarber, setEditingBarber] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => { fetchTurnos(); fetchConfig(); fetchServicios(); fetchBarberos(); }, []);
  useEffect(() => { generateWeeks(); }, [turnos, weekOffset]);

  useEffect(() => {
    const interval = setInterval(() => { if (activeTab === 'turnos') fetchTurnosSilent(); }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (turnos.length > lastTurnosCount && lastTurnosCount > 0) {
      const nuevos = turnos.slice(lastTurnosCount);
      const ultimo = nuevos[nuevos.length - 1];
      if (ultimo && ultimo.nombre) mostrarNotificacion(ultimo);
    }
    setLastTurnosCount(turnos.length);
  }, [turnos]);

  const fetchTurnos = async () => {
    try {
      const res = await fetch(`${API_URL}?action=getTurnos`);
      const data = await res.json();
      setTurnos(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchTurnosSilent = async () => {
    try {
      const res = await fetch(`${API_URL}?action=getTurnos`);
      const data = await res.json();
      setTurnos(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}?action=getConfig`);
      const data = await res.json();
      setConfig({ fechaHasta: data.fechaHasta || '', diasHabilitados: data.diasHabilitados || '' });
    } catch (e) { console.error(e); }
  };

  const fetchServicios = async () => {
    try {
      const res = await fetch(`${API_URL}?action=getServicios`);
      const data = await res.json();
      setServicios(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchBarberos = async () => {
    try {
      const res = await fetch(`${API_URL}?action=getBarberos`);
      const data = await res.json();
      setBarberos(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const generateWeeks = () => {
    if (turnos.length === 0) { setWeeks([]); return; }
    const fechas = [...new Set(turnos.map(t => t.fecha))].sort();
    const weeksArray = [];
    for (let i = 0; i < fechas.length; i += 7) weeksArray.push(fechas.slice(i, i + 7));
    setWeeks(weeksArray);
  };

  // ─── AGREGAR SERVICIO ───
  const handleAddServicio = async () => {
    if (!newService.nombre.trim() || !newService.duracion || !newService.precio) {
      setSuccessModal({ title: '⚠️ Campos incompletos', message: 'Completá todos los campos.', icon: 'warning' }); return;
    }
    try {
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addServicio', nombre: newService.nombre, duracion: newService.duracion, precio: newService.precio }) });
      const data = await res.json();
      if (data.success) {
        setSuccessModal({ title: '✅ Agregado', message: `Servicio "${newService.nombre}" guardado.`, icon: 'success' });
        setNewService({ nombre: '', duracion: '', precio: '' }); fetchServicios();
      } else { setSuccessModal({ title: '❌ Error', message: data.error, icon: 'error' }); }
    } catch (error) { setSuccessModal({ title: '❌ Error', message: 'No se pudo conectar.', icon: 'error' }); }
  };

  const handleDeleteServicio = async (id) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    try {
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteServicio', id }) });
      const data = await res.json();
      if (data.success) { fetchServicios(); setSuccessModal({ title: '✅ Eliminado', message: 'Servicio eliminado.', icon: 'success' }); }
    } catch (e) { console.error(e); }
  };

  // ─── AGREGAR BARBERO (CON URL MANUAL) ───
  const handleAddBarbero = async () => {
    if (!newBarber.nombre.trim()) {
      setSuccessModal({ title: '⚠️ Campo incompleto', message: 'El nombre es obligatorio.', icon: 'warning' }); return;
    }
    try {
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addBarbero', nombre: newBarber.nombre, especialidad: newBarber.especialidad, fotoUrl: newBarber.fotoUrl }) });
      const data = await res.json();
      if (data.success) {
        setSuccessModal({ title: '✅ Agregado', message: `Barbero "${newBarber.nombre}" guardado.`, icon: 'success' });
        setNewBarber({ nombre: '', especialidad: '', fotoUrl: '' });
        fetchBarberos();
      } else { setSuccessModal({ title: '❌ Error', message: data.error, icon: 'error' }); }
    } catch (error) { setSuccessModal({ title: '❌ Error', message: 'No se pudo conectar.', icon: 'error' }); }
  };

  const handleDeleteBarbero = async (id) => {
    if (!confirm('¿Eliminar este barbero?')) return;
    try {
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteBarbero', id }) });
      const data = await res.json();
      if (data.success) { fetchBarberos(); setSuccessModal({ title: '✅ Eliminado', message: 'Barbero eliminado.', icon: 'success' }); }
    } catch (e) { console.error(e); }
  };

  // ─── EDITAR BARBERO (CON URL MANUAL) ───
  const handleEditBarbero = async () => {
    if (!editingBarber.nombre.trim()) {
      setSuccessModal({ title: '⚠️ Campo incompleto', message: 'El nombre es obligatorio.', icon: 'warning' }); return;
    }
    try {
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'updateBarbero', id: editingBarber.id, nombre: editingBarber.nombre, especialidad: editingBarber.especialidad, fotoUrl: editingBarber.fotoUrl }) });
      const data = await res.json();
      if (data.success) {
        setSuccessModal({ title: '✅ Actualizado', message: `Barbero "${editingBarber.nombre}" actualizado.`, icon: 'success' });
        setShowEditModal(false); setEditingBarber(null);
        fetchBarberos();
      } else { setSuccessModal({ title: '❌ Error', message: data.error, icon: 'error' }); }
    } catch (error) { setSuccessModal({ title: '❌ Error', message: 'No se pudo conectar.', icon: 'error' }); }
  };

  // ─── FUNCIONES DE TURNOS ───
  const toggleDay = (fecha) => setExpandedDays(prev => ({ ...prev, [fecha]: !prev[fecha] }));
  const expandAllWeek = () => { const f = weeks[weekOffset] || []; const n = { ...expandedDays }; f.forEach(x => n[x] = true); setExpandedDays(n); };
  const collapseAll = () => setExpandedDays({});
  const goToDate = (fecha) => { setSearchDate(fecha); for (let i = 0; i < weeks.length; i++) { if (weeks[i].includes(fecha)) { setWeekOffset(i); setExpandedDays(prev => ({ ...prev, [fecha]: true })); break; } } };
  
  const stats = { total: turnos.length, reservados: turnos.filter(t => t.nombre).length, pendientes: turnos.filter(t => t.nombre && !t.confirmado).length, confirmados: turnos.filter(t => t.confirmado).length };
  
  const mostrarNotificacion = (t) => {
    if (!notificationsEnabled) return;
    setNewReservationToast({ nombre: t.nombre, telefono: t.telefono, fecha: `${getDayName(t.fecha)} ${formatDate(t.fecha)}`, horario: t.horario, barbero: t.barbero });
    if (soundEnabled) playNotificationSound();
    setTimeout(() => setNewReservationToast(null), 8000);
  };

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  const handleGenerar = async () => {
    if (!config.fechaHasta || !config.diasHabilitados) { setSuccessModal({ title: '⚠️ Campos incompletos', message: 'Completá fecha y días.', icon: 'warning' }); return; }
    setConfirmModal({ title: '⚠️ Generar Turnos', message: 'Esto borrará los turnos existentes y generará nuevos.', icon: 'warning', onConfirm: async () => {
      setLoading(true); setConfirmModal(null);
      await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'updateConfig', fechaHasta: config.fechaHasta, diasHabilitados: config.diasHabilitados }) });
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'generarDesdeConfig', fechaHasta: config.fechaHasta, diasHabilitados: config.diasHabilitados }) });
      const data = await res.json();
      if (data.success) { setSuccessModal({ title: '✅ Completado', message: data.message, icon: 'success' }); fetchTurnos(); }
      else { setSuccessModal({ title: '❌ Error', message: data.error, icon: 'error' }); }
      setLoading(false);
    }});
  };

  const handleConfirmar = (t) => {
    if (t.confirmado) { confirmarTurnoAPI(t); return; }
    if (!t.nombre || !t.telefono) { setSuccessModal({ title: '⚠️ Info incompleta', message: 'Faltan datos del cliente.', icon: 'warning' }); return; }
    setConfirmModal({ title: '✅ Confirmar', message: `¿Confirmar turno de ${t.nombre} con ${t.barbero}?`, icon: 'confirm', onConfirm: async () => { setConfirmModal(null); await confirmarTurnoAPI(t); } });
  };

  const confirmarTurnoAPI = async (t) => {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'confirmar', id: t.id }) });
    const data = await res.json();
    if (data.success) { if (data.confirmado) setContactModal({ turno: t, confirmado: true }); fetchTurnos(); }
  };

  const handleCancelar = (t) => {
    setConfirmModal({ title: '🗑️ Cancelar', message: `¿Cancelar reserva de ${t.nombre}?`, icon: 'delete', onConfirm: async () => {
      setConfirmModal(null);
      await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'cancelar', id: t.id }) });
      setSuccessModal({ title: '✅ Cancelado', message: 'Reserva eliminada', icon: 'success' });
      fetchTurnos();
    }});
  };

  const handleEliminarDia = (fecha) => {
    const delDia = turnos.filter(t => t.fecha === fecha);
    setConfirmModal({ title: '🗑️ Eliminar Día', message: `Se eliminarán ${delDia.length} turnos.`, icon: 'danger', onConfirm: async () => {
      setConfirmModal(null);
      const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'eliminarDia', fecha }) });
      const data = await res.json();
      if (data.success) { setSuccessModal({ title: '✅ Eliminado', message: `${data.eliminados} turnos eliminados`, icon: 'success' }); fetchTurnos(); }
    }});
  };

  const getWhatsAppMessage = (t) => `Hola ${t.nombre}! 👋\n\nTurno confirmado en *The Barber Cut* ✂️\n👨‍🎨 ${t.barbero}\n💇 ${t.servicio || 'Servicio'}\n📅 ${getDayName(t.fecha)} ${formatDate(t.fecha)}\n🕐 ${t.horario}\n\n¡Te esperamos!`;
  const normalizePhone = (p) => { const c = p.replace(/\D/g, ''); return c.length <= 10 ? `54${c}` : c; };
  const handleWhatsApp = () => { if (!contactModal) return; window.open(`https://wa.me/${normalizePhone(contactModal.turno.telefono)}?text=${encodeURIComponent(getWhatsAppMessage(contactModal.turno))}`, '_blank'); setContactModal(null); };
  const handleCall = () => { if (!contactModal) return; window.location.href = `tel:${contactModal.turno.telefono}`; setContactModal(null); };

  const turnosFiltrados = turnos.filter(t => {
    if (filter === 'confirmados') return t.confirmado;
    if (filter === 'pendientes') return t.nombre && !t.confirmado;
    if (filter === 'reservados') return t.nombre;
    if (filter === 'libres') return !t.nombre && t.habilitado;
    return true;
  });

  const agruparPorFecha = (lista) => {
    const g = {}; lista.forEach(t => { if (!g[t.fecha]) g[t.fecha] = []; g[t.fecha].push(t); }); return g;
  };

  const formatDate = (d) => { if (!d) return ''; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };
  const getDayName = (d) => { if (!d) return ''; const names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']; return names[new Date(d.split('-')[0], d.split('-')[1] - 1, d.split('-')[2]).getDay()]; };
  const getDayNameFull = (d) => { if (!d) return ''; const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']; return names[new Date(d.split('-')[0], d.split('-')[1] - 1, d.split('-')[2]).getDay()]; };
  const diasSemana = [{ v: 0, l: 'Dom' }, { v: 1, l: 'Lun' }, { v: 2, l: 'Mar' }, { v: 3, l: 'Mié' }, { v: 4, l: 'Jue' }, { v: 5, l: 'Vie' }, { v: 6, l: 'Sáb' }];
  
  const handleWeekChange = (dir) => { const n = weekOffset + dir; if (n >= 0 && n < weeks.length) { setWeekOffset(n); setExpandedDays({}); } };
  const currentWeekFechas = weeks[weekOffset] || [];
  const gruposSemana = agruparPorFecha(turnosFiltrados.filter(t => currentWeekFechas.includes(t.fecha)));
  const getDaySummary = (fecha) => { const delDia = turnos.filter(t => t.fecha === fecha); return { total: delDia.length, reservados: delDia.filter(t => t.nombre).length, pendientes: delDia.filter(t => t.nombre && !t.confirmado).length, confirmados: delDia.filter(t => t.confirmado).length }; };

  return (
    <div className="admin-panel">
      <div className="admin-tabs">
        <button className={`tab-btn ${activeTab === 'turnos' ? 'active' : ''}`} onClick={() => setActiveTab('turnos')}>📅 Turnos</button>
        <button className={`tab-btn ${activeTab === 'servicios' ? 'active' : ''}`} onClick={() => setActiveTab('servicios')}>💇 Servicios</button>
        <button className={`tab-btn ${activeTab === 'barberos' ? 'active' : ''}`} onClick={() => setActiveTab('barberos')}>👨‍🎨 Barberos</button>
      </div>

      {activeTab === 'turnos' && (
        <>
          <div className="stats-bar">
            <div className="stat-card stat-total"><span className="stat-number">{stats.total}</span><span className="stat-label">Total</span></div>
            <div className="stat-card stat-reservados"><span className="stat-number">{stats.reservados}</span><span className="stat-label">Reservados</span></div>
            <div className="stat-card stat-pendientes"><span className="stat-number">{stats.pendientes}</span><span className="stat-label">⏳ Pendientes</span></div>
            <div className="stat-card stat-confirmados"><span className="stat-number">{stats.confirmados}</span><span className="stat-label">✅ Confirmados</span></div>
          </div>

          {stats.pendientes > 0 && (
            <div className="alert-pendientes" onClick={() => setFilter('pendientes')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>Tenés <strong>{stats.pendientes}</strong> pendiente{stats.pendientes > 1 ? 's' : ''} de confirmar</span>
              <span className="alert-arrow">→</span>
            </div>
          )}

          <div className="config-section">
            <h3>⚙️ Generar Turnos</h3>
            <div className="config-row">
              <label>Fecha hasta: <input type="date" value={config.fechaHasta} onChange={e => setConfig({ ...config, fechaHasta: e.target.value })} /></label>
            </div>
            <div className="config-row">
              <label>Días habilitados:</label>
              <div className="dias-checks">
                {diasSemana.map(d => (
                  <label key={d.v} className="dia-check">
                    <input type="checkbox" checked={config.diasHabilitados.split(',').map(Number).includes(d.v)} onChange={() => {
                      const arr = config.diasHabilitados.split(',').map(Number);
                      if (arr.includes(d.v)) setConfig({ ...config, diasHabilitados: arr.filter(x => x !== d.v).join(',') });
                      else { arr.push(d.v); setConfig({ ...config, diasHabilitados: arr.sort().join(',') }); }
                    }} /> {d.l}
                  </label>
                ))}
              </div>
            </div>
            <button className="btn-generar" onClick={handleGenerar} disabled={loading}>{loading ? 'Generando...' : '🔄 Generar Turnos'}</button>
          </div>

          <div className="filters">
            {['todos', 'reservados', 'pendientes', 'confirmados', 'libres'].map(f => (
              <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>

          <div className="search-section">
            <label>🔍 Ir a fecha:</label>
            <input type="date" value={searchDate} min={new Date().toISOString().split('T')[0]} onChange={e => { setSearchDate(e.target.value); if (e.target.value) goToDate(e.target.value); }} className="search-date-input" />
          </div>

          {weeks.length > 0 && (
            <div className="week-nav-admin">
              <button className="week-nav-btn" onClick={() => handleWeekChange(-1)} disabled={weekOffset === 0}>← Anterior</button>
              <div className="week-actions">
                <span className="week-label">Semana {weekOffset + 1} de {weeks.length}</span>
                <div className="week-buttons">
                  <button className="btn-small" onClick={expandAllWeek}>Expandir</button>
                  <button className="btn-small" onClick={collapseAll}>Colapsar</button>
                </div>
              </div>
              <button className="week-nav-btn" onClick={() => handleWeekChange(1)} disabled={weekOffset >= weeks.length - 1}>Siguiente →</button>
            </div>
          )}

          {currentWeekFechas.length === 0 ? <p className="no-turnos">No hay turnos</p> : currentWeekFechas.map(fecha => {
            const delDia = gruposSemana[fecha] || [];
            if (delDia.length === 0) return null;
            const summary = getDaySummary(fecha);
            const isExpanded = expandedDays[fecha] || false;
            return (
              <div key={fecha} className={`day-accordion ${isExpanded ? 'expanded' : ''} ${summary.pendientes > 0 ? 'has-pendientes' : ''}`}>
                <div className="day-header" onClick={() => toggleDay(fecha)}>
                  <div className="day-header-left">
                    <svg className={`chevron ${isExpanded ? 'rotated' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    <div className="day-title">
                      <h3>{getDayNameFull(fecha)} {formatDate(fecha)}</h3>
                      <div className="day-badges">
                        <span className="badge badge-total">{summary.total}</span>
                        {summary.reservados > 0 && <span className="badge badge-reservados">{summary.reservados} res.</span>}
                        {summary.pendientes > 0 && <span className="badge badge-pendientes">⏳ {summary.pendientes} pend.</span>}
                      </div>
                    </div>
                  </div>
                  <button className="btn-eliminar-dia" onClick={(e) => { e.stopPropagation(); handleEliminarDia(fecha); }}>🗑️</button>
                </div>
                {isExpanded && (
                  <div className="day-content">
                    <div className="turnos-table-container">
                      <table className="turnos-table">
                        <thead><tr><th>Horario</th><th>Barbero</th><th>Cliente</th><th>Teléfono</th><th>Servicio</th><th>Conf.</th><th>Hab.</th><th>Acc.</th></tr></thead>
                        <tbody>
                          {delDia.map(t => (
                            <tr key={t.id} className={`${t.nombre ? 'reservado' : ''} ${t.confirmado ? 'confirmado-row' : ''} ${t.nombre && !t.confirmado ? 'pendiente-row' : ''}`}>
                              <td className="horario-cell" data-label="Horario">{t.horario}</td>
                              <td data-label="Barbero"><span className="barber-tag">{t.barbero}</span></td>
                              <td data-label="Cliente">{t.nombre || '—'}</td>
                              <td data-label="Teléfono">{t.telefono ? <a href={`tel:${t.telefono}`} className="telefono-link">📞</a> : '—'}</td>
                              <td data-label="Servicio">{t.servicio || '—'}</td>
                              <td data-label="Conf."><input type="checkbox" checked={t.confirmado} onChange={() => handleConfirmar(t)} className="checkbox-confirm" /></td>
                              <td data-label="Hab."><input type="checkbox" checked={t.habilitado} onChange={() => {}} className="checkbox-habilitar" disabled /></td>
                              <td data-label="Acc.">{t.nombre && <button className="btn-cancelar" onClick={() => handleCancelar(t)}>🗑️</button>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {activeTab === 'servicios' && (
        <div className="management-section">
          <h3>💇 Gestionar Servicios</h3>
          <div className="add-form">
            <input placeholder="Nombre (ej: Corte)" value={newService.nombre} onChange={e => setNewService({...newService, nombre: e.target.value})} />
            <input type="number" placeholder="Duración (min)" value={newService.duracion} onChange={e => setNewService({...newService, duracion: e.target.value})} />
            <input type="number" placeholder="Precio ($)" value={newService.precio} onChange={e => setNewService({...newService, precio: e.target.value})} />
            <button className="btn-add" onClick={handleAddServicio}>+ Agregar</button>
          </div>
          <div className="management-list">
            {servicios.map(s => (
              <div key={s.id} className="management-item">
                <div className="item-info">
                  <strong>{s.nombre}</strong>
                  <span>{s.duracion} min</span>
                  <span className="item-price">${parseInt(s.precio).toLocaleString('es-AR')}</span>
                </div>
                <button className="btn-delete-item" onClick={() => handleDeleteServicio(s.id)}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'barberos' && (
        <div className="management-section">
          <h3>👨‍🎨 Gestionar Barberos</h3>
          <div className="add-form">
            <input placeholder="Nombre" value={newBarber.nombre} onChange={e => setNewBarber({...newBarber, nombre: e.target.value})} />
            <input placeholder="Especialidad (ej: Degradados)" value={newBarber.especialidad} onChange={e => setNewBarber({...newBarber, especialidad: e.target.value})} />
            <input placeholder="URL de foto (Google Drive)" value={newBarber.fotoUrl} onChange={e => setNewBarber({...newBarber, fotoUrl: e.target.value})} />
            <button className="btn-add" onClick={handleAddBarbero}>+ Agregar</button>
          </div>
          <div className="management-list">
            {barberos.map(b => (
              <div key={b.id} className="management-item">
                <div className="item-info barber-info">
                  {b.fotoUrl ? <img src={b.fotoUrl} alt={b.nombre} className="mini-avatar" /> : <div className="mini-avatar empty">{b.nombre.charAt(0)}</div>}
                  <div>
                    <strong>{b.nombre}</strong>
                    <span>{b.especialidad}</span>
                  </div>
                </div>
                <div className="item-actions">
                  <button className="btn-edit-item" onClick={() => { setEditingBarber({...b}); setShowEditModal(true); }} title="Editar barbero">✏️</button>
                  <button className="btn-delete-item" onClick={() => handleDeleteBarbero(b.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEditModal && editingBarber && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>✏️ Editar Barbero</h3>
              <button className="btn-close-edit" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="edit-form">
              <div className="edit-field">
                <label>Nombre:</label>
                <input value={editingBarber.nombre} onChange={e => setEditingBarber({...editingBarber, nombre: e.target.value})} placeholder="Nombre del barbero" />
              </div>
              <div className="edit-field">
                <label>Especialidad:</label>
                <input value={editingBarber.especialidad} onChange={e => setEditingBarber({...editingBarber, especialidad: e.target.value})} placeholder="Ej: Degradados, Barba, etc." />
              </div>
              <div className="edit-field">
                <label>URL de foto (Google Drive):</label>
                <input value={editingBarber.fotoUrl || ''} onChange={e => setEditingBarber({...editingBarber, fotoUrl: e.target.value})} placeholder="https://lh3.googleusercontent.com/d/..." />
              </div>
            </div>
            <div className="modal-actions-edit">
              <button className="btn-cancel-edit" onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button className="btn-save-edit" onClick={handleEditBarbero}>💾 Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {newReservationToast && (
        <div className="toast-notification" onClick={() => setNewReservationToast(null)}>
          <div className="toast-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg></div>
          <div className="toast-content">
            <h4>¡Nueva Reserva! 🎉</h4>
            <p><strong>{newReservationToast.nombre}</strong></p>
            <p>👨‍🎨 {newReservationToast.barbero}</p>
            <p>📅 {newReservationToast.fecha} a las {newReservationToast.horario}</p>
          </div>
          <button className="toast-close" onClick={(e) => { e.stopPropagation(); setNewReservationToast(null); }}>✕</button>
        </div>
      )}

      {successModal && (
        <div className="modal-overlay" onClick={() => setSuccessModal(null)}>
          <div className="success-modal" onClick={e => e.stopPropagation()}>
            <div className={`success-icon-container ${successModal.icon}`}>
              {successModal.icon === 'success' && <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>}
              {successModal.icon === 'warning' && <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
              {successModal.icon === 'error' && <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
            </div>
            <h3>{successModal.title}</h3>
            <p className="success-message">{successModal.message}</p>
            <button className="btn-success-close" onClick={() => setSuccessModal(null)}>Entendido</button>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className={`modal-icon-container ${confirmModal.icon}`}>
              {confirmModal.icon === 'warning' && <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
              {confirmModal.icon === 'delete' && <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#e94560" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>}
              {confirmModal.icon === 'danger' && <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
              {confirmModal.icon === 'confirm' && <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>}
            </div>
            <h3>{confirmModal.title}</h3>
            <p className="modal-message">{confirmModal.message}</p>
            <div className="modal-actions-confirm">
              <button className="btn-modal-cancel" onClick={() => setConfirmModal(null)}>Cancelar</button>
              <button className={`btn-modal-confirm ${confirmModal.icon}`} onClick={confirmModal.onConfirm}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {contactModal && contactModal.confirmado && (
        <div className="modal-overlay" onClick={() => setContactModal(null)}>
          <div className="contact-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-success"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg></div>
              <h3>¡Turno Confirmado!</h3>
              <p className="modal-subtitle">¿Contactar al cliente?</p>
            </div>
            <div className="modal-client-info">
              <div className="client-detail"><span>👤 Cliente</span><span>{contactModal.turno.nombre}</span></div>
              <div className="client-detail"><span>👨‍🎨 Barbero</span><span>{contactModal.turno.barbero}</span></div>
            </div>
            <div className="modal-contact-actions">
              <button className="btn-whatsapp" onClick={handleWhatsApp}>WhatsApp</button>
              <button className="btn-call" onClick={handleCall}>Llamar</button>
            </div>
            <button className="btn-close-modal" onClick={() => setContactModal(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}