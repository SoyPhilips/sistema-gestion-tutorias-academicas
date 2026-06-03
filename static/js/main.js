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
    const rol = document.getElementById('reg-rol').value;
    const fieldsEst = document.getElementById('fields-estudiante');
    const fieldsDoc = document.getElementById('fields-docente');
    
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
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const rol = document.getElementById('reg-rol').value;
    
    const body = { nombre, email, password, rol };
    
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
    
    container.innerHTML = slots.map(slot => `
        <div class="slot-item">
            <div class="slot-info">
                <span class="slot-time">${escapeHTML(slot.fecha)}</span>
                <span class="slot-meta">${escapeHTML(slot.hora_inicio)} - ${escapeHTML(slot.hora_fin)}</span>
            </div>
            <span class="status-badge status-${slot.estado === 'Libre' ? 'confirmada' : 'pendiente'}">
                ${escapeHTML(slot.estado)}
            </span>
        </div>
    `).join('');
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
                    <td><strong>${escapeHTML(t.estudiante_nombre)}</strong></td>
                    <td>${escapeHTML(t.carrera)}<br><span style="font-size:0.75rem; color:var(--text-secondary);">${escapeHTML(t.matricula)}</span></td>
                    <td>${escapeHTML(t.fecha_hora)}</td>
                    <td>${escapeHTML(t.motivo)}</td>
                    <td><span class="status-badge status-${t.estado.toLowerCase()}">${escapeHTML(t.estado)}</span></td>
                    <td>${actionColumnHtml}</td>
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
                    <td><strong>${escapeHTML(t.docente_nombre)}</strong></td>
                    <td>${escapeHTML(t.especialidad)}<br><span style="font-size:0.75rem; color:var(--text-secondary);">${escapeHTML(t.cubiculo)}</span></td>
                    <td>${escapeHTML(t.fecha_hora)}</td>
                    <td>${escapeHTML(t.motivo)}</td>
                    <td><span class="status-badge status-${t.estado.toLowerCase()}">${escapeHTML(t.estado)}</span></td>
                    <td>${actionColumnHtml}</td>
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

// --- REPORT EXPORT HANDLER (RF-09) ---

function openReportModal(tutoriaId) {
    const tutoria = allTutorias.find(t => t.id === tutoriaId);
    if (!tutoria) return;
    
    const container = document.getElementById('report-content');
    
    let userDetails = '';
    if (window.currentUserRol === 'Docente') {
        userDetails = `
            <p><strong>Estudiante:</strong> ${escapeHTML(tutoria.estudiante_nombre)}</p>
            <p><strong>Matrícula:</strong> ${escapeHTML(tutoria.matricula)}</p>
            <p><strong>Carrera:</strong> ${escapeHTML(tutoria.carrera)}</p>
        `;
    } else {
        userDetails = `
            <p><strong>Docente:</strong> ${escapeHTML(tutoria.docente_nombre)}</p>
            <p><strong>Especialidad:</strong> ${escapeHTML(tutoria.especialidad)}</p>
            <p><strong>Cubículo:</strong> ${escapeHTML(tutoria.cubiculo)}</p>
        `;
    }
    
    container.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: 6px; margin-bottom: 1.5rem;">
            ${userDetails}
            <p><strong>Fecha y Hora:</strong> ${escapeHTML(tutoria.fecha_hora)}</p>
            <p><strong>Motivo de la Tutoría:</strong> ${escapeHTML(tutoria.motivo)}</p>
            <p><strong>Estado:</strong> <span class="status-badge status-finalizada">${escapeHTML(tutoria.estado)}</span></p>
        </div>
        <div style="border-left: 4px solid var(--accent-blue); padding-left: 1rem; margin-top: 1rem;">
            <h4 style="margin-bottom: 0.5rem; color: var(--accent-blue);">Observaciones Pedagógicas y Seguimiento</h4>
            <p style="font-style: italic;">"${escapeHTML(tutoria.observaciones)}"</p>
        </div>
    `;
    
    openModal('report-modal');
}
