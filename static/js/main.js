// Helper to escape HTML and prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Show toast alert
function showToast(message, duration = 4000) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, duration);
    }
}

// --- AUTH PAGE FUNCTIONS ---

function switchTab(type) {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login-el');
    const formRegister = document.getElementById('form-register-el');
    
    if (type === 'login') {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.style.display = 'block';
        formRegister.style.display = 'none';
    } else {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.style.display = 'block';
        formLogin.style.display = 'none';
    }
}

function toggleRoleFields() {
    const regRolEl = document.getElementById('reg-rol');
    if (!regRolEl) return;
    const rol = regRolEl.value;
    const fieldsEst = document.getElementById('fields-estudiante');
    const fieldsDoc = document.getElementById('fields-docente');
    if (!fieldsEst || !fieldsDoc) return;
    
    const inputMatricula = document.getElementById('reg-matricula');
    const inputCarrera = document.getElementById('reg-carrera');
    const inputEspecialidad = document.getElementById('reg-especialidad');
    const inputCubiculo = document.getElementById('reg-cubiculo');
    
    if (rol === 'Estudiante') {
        fieldsEst.style.display = 'block';
        fieldsDoc.style.display = 'none';
        if (inputMatricula) inputMatricula.required = true;
        if (inputCarrera) inputCarrera.required = true;
        if (inputEspecialidad) inputEspecialidad.required = false;
        if (inputCubiculo) inputCubiculo.required = false;
    } else {
        fieldsEst.style.display = 'none';
        fieldsDoc.style.display = 'block';
        if (inputMatricula) inputMatricula.required = false;
        if (inputCarrera) inputCarrera.required = false;
        if (inputEspecialidad) inputEspecialidad.required = true;
        if (inputCubiculo) inputCubiculo.required = true;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            window.location.href = '/dashboard';
        } else {
            showToast(data.error || 'Error al iniciar sesión');
        }
    } catch (err) {
        showToast('Error de conexión al servidor');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const nombres = document.getElementById('reg-nombres').value;
    const apellidos = document.getElementById('reg-apellidos').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const rol = document.getElementById('reg-rol').value;
    
    const body = { nombres, apellidos, email, password, rol };
    
    if (rol === 'Estudiante') {
        body.matricula = document.getElementById('reg-matricula').value;
        body.carrera = document.getElementById('reg-carrera').value;
    } else {
        body.especialidad = document.getElementById('reg-especialidad').value;
        body.cubiculo = document.getElementById('reg-cubiculo').value;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Registro exitoso. Inicia sesión.');
            switchTab('login');
            // Clear inputs
            document.getElementById('form-register-el').reset();
            toggleRoleFields();
        } else {
            showToast(data.error || 'Error al registrarse');
        }
    } catch (err) {
        showToast('Error de conexión al servidor');
    }
}

async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/';
        }
    } catch (err) {
        showToast('Error de conexión');
    }
}

// --- DASHBOARD CORE FUNCTIONS ---

let allAvailabilities = [];
let allTutorias = [];
let tutoriaFilterState = 'Todas';

function initDashboard() {
    const role = window.currentUserRol;
    
    // Set headers
    const headers = document.getElementById('table-headers');
    if (role === 'Docente') {
        document.getElementById('panel-docente-crear').style.display = 'block';
        document.getElementById('panel-docente-lista').style.display = 'block';
        headers.innerHTML = `
            <th>Estudiante</th>
            <th>Carrera / Matrícula</th>
            <th>Fecha / Bloque</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Acciones</th>
        `;
        loadDocenteAvailabilities();
    } else {
        document.getElementById('panel-estudiante-solicitar').style.display = 'block';
        headers.innerHTML = `
            <th>Docente</th>
            <th>Cubículo / Especialidad</th>
            <th>Fecha / Bloque</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Acciones</th>
        `;
        loadEstudianteAvailabilities();
    }
    
    loadTutorias();
    
    // Auto-poll notifications / updates every 15 seconds (RF-07)
    setInterval(() => {
        loadTutorias(true);
        if (role === 'Docente') {
            loadDocenteAvailabilities(true);
        } else {
            loadEstudianteAvailabilities(true);
        }
    }, 15000);
}

// Modal handling
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// --- DOCENTE AVAILABILITY HANDLERS ---

async function handleCreateDisponibilidad(e) {
    e.preventDefault();
    const fecha = document.getElementById('disp-fecha').value;
    const hora_inicio = document.getElementById('disp-inicio').value;
    const hora_fin = document.getElementById('disp-fin').value;
    
    try {
        const response = await fetch('/api/docente/disponibilidad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha, hora_inicio, hora_fin })
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Disponibilidad añadida correctamente');
            document.getElementById('form-disponibilidad').reset();
            loadDocenteAvailabilities();
        } else {
            showToast(data.error || 'Error al añadir disponibilidad');
        }
    } catch (err) {
        showToast('Error de conexión');
    }
}

async function loadDocenteAvailabilities(silent = false) {
    try {
        const response = await fetch('/api/docente/disponibilidades');
        const data = await response.json();
        if (response.ok) {
            renderDocenteAvailabilities(data);
        }
    } catch (err) {
        if (!silent) showToast('Error al cargar bloques');
    }
}

function renderDocenteAvailabilities(slots) {
    const container = document.getElementById('docente-slots-container');
    if (!slots || slots.length === 0) {
        container.innerHTML = '<div class="empty-state">No tienes horarios registrados.</div>';
        return;
    }
    
    container.innerHTML = slots.map(slot => {
        // Use computed estado_efectivo for display; fallback to stored estado
        const efectivo = slot.estado_efectivo || slot.estado;
        // Edit/Delete only allowed when the underlying stored estado is 'Libre'
        const isEditable = slot.estado === 'Libre';
        
        let badgeClass = 'status-confirmada'; // Libre -> green
        if (efectivo === 'Ocupado')    badgeClass = 'status-pendiente';
        if (efectivo === 'Expirada')   badgeClass = 'status-expirada';
        if (efectivo === 'Finalizada') badgeClass = 'status-finalizada';
        
        const editBtns = isEditable ? `
            <button class="btn-icon-edit" title="Editar horario"
                onclick="openEditDisponibilidadModal(${slot.id}, '${escapeHTML(slot.fecha)}', '${escapeHTML(slot.hora_inicio)}', '${escapeHTML(slot.hora_fin)}')">&#9998;</button>
            <button class="btn-icon-delete" title="Eliminar horario"
                onclick="handleDeleteDisponibilidad(${slot.id})">&#x2715;</button>
        ` : '';
        
        return `
            <div class="slot-item">
                <div class="slot-info">
                    <span class="slot-time">${escapeHTML(slot.fecha)}</span>
                    <span class="slot-meta">${escapeHTML(slot.hora_inicio)} - ${escapeHTML(slot.hora_fin)}</span>
                </div>
                <div class="slot-actions">
                    <span class="status-badge ${badgeClass}">${escapeHTML(efectivo)}</span>
                    ${editBtns}
                </div>
            </div>
        `;
    }).join('');
}

// --- EDIT / DELETE DISPONIBILIDAD ---

function openEditDisponibilidadModal(id, fecha, horaInicio, horaFin) {
    document.getElementById('edit-disp-id').value = id;
    document.getElementById('edit-disp-fecha').value = fecha;
    document.getElementById('edit-disp-inicio').value = horaInicio;
    document.getElementById('edit-disp-fin').value = horaFin;
    // Enforce future-only
    document.getElementById('edit-disp-fecha').min = new Date().toISOString().split('T')[0];
    openModal('edit-disp-modal');
}

async function handleEditDisponibilidad(e) {
    e.preventDefault();
    const id          = document.getElementById('edit-disp-id').value;
    const fecha       = document.getElementById('edit-disp-fecha').value;
    const hora_inicio = document.getElementById('edit-disp-inicio').value;
    const hora_fin    = document.getElementById('edit-disp-fin').value;
    
    try {
        const response = await fetch(`/api/docente/disponibilidad/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha, hora_inicio, hora_fin })
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Horario actualizado correctamente');
            closeModal('edit-disp-modal');
            loadDocenteAvailabilities();
        } else {
            showToast(data.error || 'Error al actualizar');
        }
    } catch (err) {
        showToast('Error de conexión');
    }
}

async function handleDeleteDisponibilidad(id) {
    if (!confirm('¿Eliminar este bloque de disponibilidad? Esta acción no se puede deshacer.')) return;
    
    try {
        const response = await fetch(`/api/docente/disponibilidad/${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Bloque eliminado correctamente');
            loadDocenteAvailabilities();
        } else {
            showToast(data.error || 'Error al eliminar');
        }
    } catch (err) {
        showToast('Error de conexión');
    }
}

// --- ESTUDIANTE SOLICITAR HANDLERS ---

async function loadEstudianteAvailabilities(silent = false) {
    try {
        const response = await fetch('/api/docente/disponibilidades');
        const data = await response.json();
        if (response.ok) {
            allAvailabilities = data;
            filterAvailabilities();
        }
    } catch (err) {
        if (!silent) showToast('Error al cargar horarios libres');
    }
}

function filterAvailabilities() {
    const search = document.getElementById('filter-search').value.toLowerCase();
    const date = document.getElementById('filter-fecha').value;
    const container = document.getElementById('estudiante-slots-container');
    
    const filtered = allAvailabilities.filter(slot => {
        const matchesSearch = slot.docente_nombre.toLowerCase().includes(search) || 
                              slot.especialidad.toLowerCase().includes(search);
        const matchesDate = !date || slot.fecha === date;
        return matchesSearch && matchesDate;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">Sin disponibilidad.</div>'; // RNF-04
        return;
    }
    
    container.innerHTML = filtered.map(slot => `
        <div class="slot-item">
            <div class="slot-info">
                <span class="slot-time">${escapeHTML(slot.docente_nombre)}</span>
                <span class="slot-meta" style="margin-bottom: 0.25rem;">${escapeHTML(slot.especialidad)} (${escapeHTML(slot.cubiculo)})</span>
                <span class="slot-meta">${escapeHTML(slot.fecha)} @ ${escapeHTML(slot.hora_inicio)} - ${escapeHTML(slot.hora_fin)}</span>
            </div>
            <button class="slot-action-btn" onclick="openSolicitarModal(${slot.id}, '${escapeHTML(slot.docente_nombre)}', '${escapeHTML(slot.fecha)}', '${escapeHTML(slot.hora_inicio)}')">
                Agendar
            </button>
        </div>
    `).join('');
}

function openSolicitarModal(id, docenteNombre, fecha, hora) {
    document.getElementById('modal-disponibilidad-id').value = id;
    document.getElementById('modal-slot-detail').textContent = `Solicitar tutoría con ${docenteNombre} para el día ${fecha} a las ${hora}`;
    document.getElementById('modal-motivo').value = '';
    openModal('solicitar-modal');
}

async function submitSolicitarTutoria(e) {
    e.preventDefault();
    const disponibilidad_id = document.getElementById('modal-disponibilidad-id').value;
    const motivo = document.getElementById('modal-motivo').value;
    
    try {
        const response = await fetch('/api/tutorias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disponibilidad_id, motivo })
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Solicitud enviada correctamente');
            closeModal('solicitar-modal');
            loadEstudianteAvailabilities();
            loadTutorias();
        } else {
            showToast(data.error || 'Error al solicitar tutoría');
        }
    } catch (err) {
        showToast('Error de conexión');
    }
}

// --- TUTORIAS HISTORY HANDLERS ---

async function loadTutorias(silent = false) {
    try {
        const response = await fetch('/api/tutorias');
        const data = await response.json();
        if (response.ok) {
            // Check for notifications on client updates (RF-07)
            if (silent && allTutorias.length > 0 && data.length === allTutorias.length) {
                for (let i = 0; i < data.length; i++) {
                    const prev = allTutorias[i];
                    const curr = data[i];
                    if (prev.id === curr.id && prev.estado !== curr.estado && window.currentUserRol === 'Estudiante') {
                        showToast(`Tu tutoría del ${curr.fecha_hora} ha cambiado de estado a: ${curr.estado}`);
                    }
                }
            }
            
            allTutorias = data;
            renderTutorias();
        }
    } catch (err) {
        if (!silent) showToast('Error al cargar tutorías');
    }
}

function filterTutorias(state) {
    tutoriaFilterState = state;
    // Update active tab styles
    const tabBtns = document.querySelectorAll('.right-panel .tab-btn');
    tabBtns.forEach(btn => {
        if (btn.textContent.trim() === (state === 'Todas' ? 'Todas' : state + 's')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderTutorias();
}

function renderTutorias() {
    const container = document.getElementById('tutorias-table-body');
    const filtered = allTutorias.filter(t => tutoriaFilterState === 'Todas' || t.estado === tutoriaFilterState);
    
    if (filtered.length === 0) {
        container.innerHTML = `<tr><td colspan="6" class="empty-state">No hay tutorías registradas.</td></tr>`;
        return;
    }
    
    const role = window.currentUserRol;
    
    container.innerHTML = filtered.map(t => {
        let actionColumnHtml = '';
        
        if (role === 'Docente') {
            if (t.estado === 'Pendiente') {
                actionColumnHtml = `
                    <div class="actions-cell">
                        <button class="btn-sm-accept" onclick="updateStatus(${t.id}, 'Confirmada')">Aceptar</button>
                        <button class="btn-sm-reject" onclick="updateStatus(${t.id}, 'Rechazada')">Rechazar</button>
                    </div>
                `;
            } else if (t.estado === 'Confirmada') {
                actionColumnHtml = `
                    <button class="btn-sm-finalize" onclick="openFinalizarModal(${t.id}, '${escapeHTML(t.estudiante_nombre)}')">Finalizar</button>
                `;
            } else if (t.estado === 'Finalizada') {
                actionColumnHtml = `
                    <button class="slot-action-btn" onclick="openReportModal(${t.id})">Comprobante</button>
                `;
            } else {
                actionColumnHtml = `<span style="color: var(--text-muted);">Sin acciones</span>`;
            }
            
            return `
                <tr>
                    <td data-label="Estudiante"><strong>${escapeHTML(t.estudiante_nombre)}</strong></td>
                    <td data-label="Carrera/Matrícula">${escapeHTML(t.carrera)}<br><span style="font-size:0.75rem; color:var(--text-secondary);">${escapeHTML(t.matricula)}</span></td>
                    <td data-label="Fecha/Hora">${escapeHTML(t.fecha_hora)}</td>
                    <td data-label="Motivo">${escapeHTML(t.motivo)}</td>
                    <td data-label="Estado"><span class="status-badge status-${t.estado.toLowerCase()}">${escapeHTML(t.estado)}</span></td>
                    <td data-label="Acciones">${actionColumnHtml}</td>
                </tr>
            `;
        } else {
            // Estudiante role rows
            if (t.estado === 'Finalizada') {
                actionColumnHtml = `
                    <button class="slot-action-btn" onclick="openReportModal(${t.id})">Comprobante</button>
                `;
            } else {
                actionColumnHtml = `<span style="color: var(--text-muted); font-size: 0.8rem;">En espera</span>`;
            }
            
            return `
                <tr>
                    <td data-label="Docente"><strong>${escapeHTML(t.docente_nombre)}</strong></td>
                    <td data-label="Especialidad/Cubículo">${escapeHTML(t.especialidad)}<br><span style="font-size:0.75rem; color:var(--text-secondary);">${escapeHTML(t.cubiculo)}</span></td>
                    <td data-label="Fecha/Hora">${escapeHTML(t.fecha_hora)}</td>
                    <td data-label="Motivo">${escapeHTML(t.motivo)}</td>
                    <td data-label="Estado"><span class="status-badge status-${t.estado.toLowerCase()}">${escapeHTML(t.estado)}</span></td>
                    <td data-label="Acciones">${actionColumnHtml}</td>
                </tr>
            `;
        }
    }).join('');
}

async function updateStatus(id, estado, observations = '') {
    try {
        const body = { estado };
        if (observations) body.observaciones = observations;
        
        const response = await fetch(`/api/tutorias/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (response.ok) {
            showToast(`Tutoría actualizada a ${estado}`);
            loadTutorias();
            if (window.currentUserRol === 'Docente') {
                loadDocenteAvailabilities();
            } else {
                loadEstudianteAvailabilities();
            }
        } else {
            showToast(data.error || 'Error al actualizar estado');
        }
    } catch (err) {
        showToast('Error de conexión');
    }
}

function openFinalizarModal(id, estudianteNombre) {
    document.getElementById('modal-tutoria-id').value = id;
    document.getElementById('modal-finalizar-detail').textContent = `Finalizar sesión con ${estudianteNombre} y registrar observaciones`;
    document.getElementById('modal-observaciones').value = '';
    openModal('finalizar-modal');
}

function submitFinalizarTutoria(e) {
    e.preventDefault();
    const id = document.getElementById('modal-tutoria-id').value;
    const obs = document.getElementById('modal-observaciones').value;
    closeModal('finalizar-modal');
    updateStatus(id, 'Finalizada', obs);
}

// --- REPORT EXPORT HANDLER (RF-09) – Premium Invoice ---

function openReportModal(tutoriaId) {
    const tutoria = allTutorias.find(t => t.id === tutoriaId);
    if (!tutoria) return;
    
    const now = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
    
    let detailCells = '';
    if (window.currentUserRol === 'Docente') {
        detailCells = `
            <div class="inv-field">
                <span class="inv-label">Docente</span>
                <span class="inv-value">${escapeHTML(window.currentUserNombre || '')}</span>
            </div>
            <div class="inv-field">
                <span class="inv-label">Estudiante</span>
                <span class="inv-value">${escapeHTML(tutoria.estudiante_nombre)}</span>
            </div>
            <div class="inv-field">
                <span class="inv-label">Carrera</span>
                <span class="inv-value">${escapeHTML(tutoria.carrera)}</span>
            </div>
            <div class="inv-field">
                <span class="inv-label">Matrícula</span>
                <span class="inv-value">${escapeHTML(tutoria.matricula)}</span>
            </div>
        `;
    } else {
        detailCells = `
            <div class="inv-field">
                <span class="inv-label">Docente</span>
                <span class="inv-value">${escapeHTML(tutoria.docente_nombre)}</span>
            </div>
            <div class="inv-field">
                <span class="inv-label">Especialidad</span>
                <span class="inv-value">${escapeHTML(tutoria.especialidad)}</span>
            </div>
            <div class="inv-field">
                <span class="inv-label">Cubículo</span>
                <span class="inv-value">${escapeHTML(tutoria.cubiculo)}</span>
            </div>
            <div class="inv-field">
                <span class="inv-label">Estado</span>
                <span class="inv-value">${escapeHTML(tutoria.estado)}</span>
            </div>
        `;
    }
    
    const reportHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante de Tutoría - #TUT-${tutoria.id}</title>
    <style>
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: #ffffff;
            color: #111827;
            margin: 0;
            padding: 2rem;
            display: flex;
            justify-content: center;
        }
        .invoice-doc {
            width: 100%;
            max-width: 660px;
            padding: 2.5rem;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            background: #fff;
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 1.4rem;
        }
        .invoice-brand-name {
            display: block;
            font-size: 1.15rem;
            font-weight: 800;
            letter-spacing: 0.05em;
            color: #1e1b4b;
        }
        .invoice-brand-sub {
            display: block;
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 0.2rem;
        }
        .invoice-official-badge {
            font-size: 0.65rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            padding: 0.35rem 0.8rem;
            border-radius: 6px;
            border: 1px solid #c7d2fe;
            color: #3730a3;
            background: #f0fdf4;
            white-space: nowrap;
        }
        .invoice-rule {
            height: 1px;
            background: #c7d2fe;
            margin-bottom: 1.4rem;
        }
        .invoice-title-block {
            margin-bottom: 1.4rem;
        }
        .invoice-title {
            font-size: 1.35rem;
            font-weight: 700;
            margin: 0 0 0.3rem 0;
            color: #111827;
        }
        .invoice-ref {
            font-size: 0.8rem;
            color: #6b7280;
            margin: 0;
        }
        .invoice-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.7rem;
            margin-bottom: 1.1rem;
        }
        .inv-field {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 0.8rem 0.95rem;
        }
        .inv-field.inv-full {
            grid-column: 1 / -1;
        }
        .inv-label {
            display: block;
            font-size: 0.67rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            color: #9ca3af;
            margin-bottom: 0.3rem;
        }
        .inv-value {
            display: block;
            font-size: 0.9rem;
            font-weight: 500;
            color: #111827;
            line-height: 1.45;
        }
        .invoice-status-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.7rem 1rem;
            border-radius: 8px;
            border: 1px solid #bbf7d0;
            background: #f0fdf4;
            margin-bottom: 1.1rem;
            font-size: 0.82rem;
        }
        .invoice-status-label {
            color: #374151;
            font-weight: 500;
        }
        .status-badge {
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            border: 1px solid #bbf7d0;
            background: #dcfce7;
            color: #166534;
        }
        .invoice-obs-block {
            border-left: 3px solid #6366f1;
            padding: 0.9rem 1.1rem;
            margin-bottom: 1.4rem;
            background: #eef2ff;
            border-radius: 0 8px 8px 0;
        }
        .invoice-obs-title {
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            color: #4338ca;
            margin: 0 0 0.6rem 0;
        }
        .invoice-obs-text {
            font-size: 0.9rem;
            line-height: 1.7;
            font-style: italic;
            color: #374151;
            margin: 0;
        }
        .invoice-footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 0.9rem;
            font-size: 0.73rem;
            color: #6b7280;
            line-height: 1.65;
        }
        .invoice-timestamp {
            margin: 0.3rem 0 0 0;
            font-weight: 500;
            color: #374151;
        }
        @media print {
            body {
                padding: 0;
            }
            .invoice-doc {
                border: none;
                box-shadow: none;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-doc">
        <!-- Header -->
        <div class="invoice-header">
            <div class="invoice-brand">
                <span class="invoice-brand-name">TUTORÍAS ACADÉMICAS</span>
                <span class="invoice-brand-sub">Sistema de Gestión Académica</span>
            </div>
            <span class="invoice-official-badge">COMPROBANTE OFICIAL</span>
        </div>

        <div class="invoice-rule"></div>

        <!-- Document title -->
        <div class="invoice-title-block">
            <h2 class="invoice-title">Cierre de Tutoría Académica</h2>
            <p class="invoice-ref">Referencia&nbsp;#TUT-${tutoria.id} &bull; Emitido el ${now}</p>
        </div>

        <!-- Detail grid -->
        <div class="invoice-grid">
            ${detailCells}
            <div class="inv-field inv-full">
                <span class="inv-label">Fecha y Bloque Horario</span>
                <span class="inv-value">${escapeHTML(tutoria.fecha_hora)}</span>
            </div>
            <div class="inv-field inv-full">
                <span class="inv-label">Motivo de la Tutoría</span>
                <span class="inv-value">${escapeHTML(tutoria.motivo)}</span>
            </div>
        </div>

        <!-- Status row -->
        <div class="invoice-status-row">
            <span class="invoice-status-label">Estado de la Sesión</span>
            <span class="status-badge">${escapeHTML(tutoria.estado)}</span>
        </div>

        <!-- Observations -->
        <div class="invoice-obs-block">
            <h4 class="invoice-obs-title">Observaciones y Diagnóstico Pedagógico</h4>
            <p class="invoice-obs-text">&ldquo;${escapeHTML(tutoria.observaciones)}&rdquo;</p>
        </div>

        <!-- Footer -->
        <div class="invoice-footer">
            <p style="margin: 0 0 0.3rem 0;">Documento generado digitalmente por el Sistema de Gestión de Tutorías Académicas. Su contenido es de carácter académico e informativo.</p>
            <p class="invoice-timestamp">Generado el: ${now}</p>
        </div>
    </div>
    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(reportHtml);
        printWindow.document.close();
        printWindow.focus();
    } else {
        showToast('El navegador bloqueó la ventana emergente del comprobante.');
    }
}
