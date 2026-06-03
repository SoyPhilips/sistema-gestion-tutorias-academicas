import os
import sqlite3
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.urandom(24) # Robust dynamic session key

DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # Create usuarios table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            rol TEXT NOT NULL CHECK(rol IN ('Estudiante', 'Docente')),
            matricula TEXT,
            carrera TEXT,
            especialidad TEXT,
            cubiculo TEXT
        );
    ''')
    
    # Create disponibilidades table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS disponibilidades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            docente_id INTEGER NOT NULL,
            fecha TEXT NOT NULL,
            hora_inicio TEXT NOT NULL,
            hora_fin TEXT NOT NULL,
            estado TEXT NOT NULL DEFAULT 'Libre' CHECK(estado IN ('Libre', 'Ocupado')),
            FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE
        );
    ''')
    
    # Create tutorias table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tutorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            estudiante_id INTEGER NOT NULL,
            docente_id INTEGER NOT NULL,
            disponibilidad_id INTEGER NOT NULL,
            fecha_hora TEXT NOT NULL,
            motivo TEXT NOT NULL,
            estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK(estado IN ('Pendiente', 'Confirmada', 'Rechazada', 'Finalizada')),
            observaciones TEXT,
            FOREIGN KEY (estudiante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            FOREIGN KEY (disponibilidad_id) REFERENCES disponibilidades(id) ON DELETE CASCADE
        );
    ''')
    
    conn.commit()
    conn.close()

# Initialize Database
init_db()

# --- TEMPLATE ROUTES ---

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('dashboard.html', user={
        'id': session.get('user_id'),
        'nombre': session.get('nombre'),
        'email': session.get('email'),
        'rol': session.get('rol')
    })

# --- API ROUTES ---

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Datos no proporcionados'}), 400
    
    nombre = data.get('nombre', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    rol = data.get('rol', '')
    
    if not nombre or not email or not password or not rol:
        return jsonify({'error': 'Todos los campos básicos son obligatorios'}), 400
        
    if rol not in ('Estudiante', 'Docente'):
        return jsonify({'error': 'Rol inválido'}), 400
        
    password_hash = generate_password_hash(password)
    
    matricula = data.get('matricula', '').strip() if rol == 'Estudiante' else None
    carrera = data.get('carrera', '').strip() if rol == 'Estudiante' else None
    especialidad = data.get('especialidad', '').strip() if rol == 'Docente' else None
    cubiculo = data.get('cubiculo', '').strip() if rol == 'Docente' else None
    
    if rol == 'Estudiante' and (not matricula or not carrera):
        return jsonify({'error': 'Matrícula y carrera son obligatorios para estudiantes'}), 400
    if rol == 'Docente' and (not especialidad or not cubiculo):
        return jsonify({'error': 'Especialidad y cubículo son obligatorios para docentes'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO usuarios (nombre, email, password_hash, rol, matricula, carrera, especialidad, cubiculo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (nombre, email, password_hash, rol, matricula, carrera, especialidad, cubiculo))
        conn.commit()
        return jsonify({'message': 'Usuario registrado exitosamente'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'El correo electrónico ya está registrado'}), 400
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Datos no proporcionados'}), 400
        
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email y contraseña son obligatorios'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM usuarios WHERE email = ?', (email,))
    user = cursor.fetchone()
    conn.close()
    
    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        session['nombre'] = user['nombre']
        session['email'] = user['email']
        session['rol'] = user['rol']
        return jsonify({
            'message': 'Inicio de sesión exitoso',
            'user': {
                'id': user['id'],
                'nombre': user['nombre'],
                'email': user['email'],
                'rol': user['rol']
            }
        }), 200
    else:
        return jsonify({'error': 'Credenciales incorrectas'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Sesión cerrada exitosamente'}), 200

# --- DOCENTE DISPONIBILIDAD ROUTES ---

@app.route('/api/docente/disponibilidad', methods=['POST'])
def create_disponibilidad():
    if 'user_id' not in session or session.get('rol') != 'Docente':
        return jsonify({'error': 'Acceso denegado'}), 403
        
    data = request.get_json()
    fecha = data.get('fecha', '').strip()
    hora_inicio = data.get('hora_inicio', '').strip()
    hora_fin = data.get('hora_fin', '').strip()
    
    if not fecha or not hora_inicio or not hora_fin:
        return jsonify({'error': 'Fecha, hora de inicio y hora de fin son obligatorios'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check for duplicate availability for the same teacher
    cursor.execute('''
        SELECT id FROM disponibilidades 
        WHERE docente_id = ? AND fecha = ? AND hora_inicio = ? AND hora_fin = ?
    ''', (session['user_id'], fecha, hora_inicio, hora_fin))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Ya has registrado esta disponibilidad'}), 400

    cursor.execute('''
        INSERT INTO disponibilidades (docente_id, fecha, hora_inicio, hora_fin, estado)
        VALUES (?, ?, ?, ?, 'Libre')
    ''', (session['user_id'], fecha, hora_inicio, hora_fin))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Disponibilidad registrada exitosamente'}), 201

@app.route('/api/docente/disponibilidades', methods=['GET'])
def get_docente_disponibilidades():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if session.get('rol') == 'Docente':
        cursor.execute('''
            SELECT * FROM disponibilidades 
            WHERE docente_id = ? 
            ORDER BY fecha ASC, hora_inicio ASC
        ''', (session['user_id'],))
    else:
        cursor.execute('''
            SELECT d.*, u.nombre AS docente_nombre, u.especialidad, u.cubiculo
            FROM disponibilidades d
            JOIN usuarios u ON d.docente_id = u.id
            WHERE d.estado = 'Libre'
            ORDER BY d.fecha ASC, d.hora_inicio ASC
        ''')
        
    rows = cursor.fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in rows]), 200

# --- TUTORIAS ROUTES ---

@app.route('/api/tutorias', methods=['POST'])
def solicitar_tutoria():
    if 'user_id' not in session or session.get('rol') != 'Estudiante':
        return jsonify({'error': 'Acceso denegado'}), 403
        
    data = request.get_json()
    disponibilidad_id = data.get('disponibilidad_id')
    motivo = data.get('motivo', '').strip()
    
    if not disponibilidad_id or not motivo:
        return jsonify({'error': 'Debe elegir una disponibilidad y proporcionar un motivo'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify slot is Libre
    cursor.execute('SELECT * FROM disponibilidades WHERE id = ? AND estado = \'Libre\'', (disponibilidad_id,))
    slot = cursor.fetchone()
    
    if not slot:
        conn.close()
        return jsonify({'error': 'El horario seleccionado ya no está disponible'}), 400
        
    # RD-01: Restricción de Solicitud Unívoca por Bloque
    cursor.execute('''
        SELECT t.id FROM tutorias t
        JOIN disponibilidades d ON t.disponibilidad_id = d.id
        WHERE t.estudiante_id = ? AND d.fecha = ? AND d.hora_inicio = ? AND d.hora_fin = ? AND t.estado IN ('Pendiente', 'Confirmada')
    ''', (session['user_id'], slot['fecha'], slot['hora_inicio'], slot['hora_fin']))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Ya tienes una tutoría activa (pendiente o confirmada) en este mismo bloque horario'}), 400
        
    docente_id = slot['docente_id']
    fecha_hora = f"{slot['fecha']} {slot['hora_inicio']}-{slot['hora_fin']}"
    
    # Reserve availability
    cursor.execute('UPDATE disponibilidades SET estado = \'Ocupado\' WHERE id = ?', (disponibilidad_id,))
    
    # Create tutoring session
    cursor.execute('''
        INSERT INTO tutorias (estudiante_id, docente_id, disponibilidad_id, fecha_hora, motivo, estado)
        VALUES (?, ?, ?, ?, ?, 'Pendiente')
    ''', (session['user_id'], docente_id, disponibilidad_id, fecha_hora, motivo))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Tutoría solicitada exitosamente'}), 201

@app.route('/api/tutorias', methods=['GET'])
def get_tutorias():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if session.get('rol') == 'Docente':
        cursor.execute('''
            SELECT t.*, u.nombre AS estudiante_nombre, u.carrera, u.matricula
            FROM tutorias t
            JOIN usuarios u ON t.estudiante_id = u.id
            WHERE t.docente_id = ?
            ORDER BY t.id DESC
        ''', (session['user_id'],))
    else:
        cursor.execute('''
            SELECT t.*, u.nombre AS docente_nombre, u.especialidad, u.cubiculo
            FROM tutorias t
            JOIN usuarios u ON t.docente_id = u.id
            WHERE t.estudiante_id = ?
            ORDER BY t.id DESC
        ''', (session['user_id'],))
        
    rows = cursor.fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in rows]), 200

@app.route('/api/tutorias/<int:tutoria_id>/estado', methods=['PUT'])
def update_tutoria_estado(tutoria_id):
    if 'user_id' not in session or session.get('rol') != 'Docente':
        return jsonify({'error': 'Acceso denegado'}), 403
        
    data = request.get_json()
    nuevo_estado = data.get('estado')
    observaciones = data.get('observaciones', '').strip()
    
    if nuevo_estado not in ('Confirmada', 'Rechazada', 'Finalizada'):
        return jsonify({'error': 'Estado inválido'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM tutorias WHERE id = ?', (tutoria_id,))
    tutoria = cursor.fetchone()
    
    if not tutoria:
        conn.close()
        return jsonify({'error': 'Tutoría no encontrada'}), 404
        
    if tutoria['docente_id'] != session['user_id']:
        conn.close()
        return jsonify({'error': 'No autorizado'}), 403
        
    # RD-02: Ciclo de Vida Determinista de la Tutoría
    actual_estado = tutoria['estado']
    if nuevo_estado == 'Confirmada' and actual_estado != 'Pendiente':
        conn.close()
        return jsonify({'error': 'Solo se pueden confirmar tutorías en estado Pendiente'}), 400
    if nuevo_estado == 'Rechazada' and actual_estado != 'Pendiente':
        conn.close()
        return jsonify({'error': 'Solo se pueden rechazar tutorías en estado Pendiente'}), 400
    if nuevo_estado == 'Finalizada' and actual_estado != 'Confirmada':
        conn.close()
        return jsonify({'error': 'Solo se pueden finalizar tutorías que estén en estado Confirmada'}), 400
        
    # RD-03: Vinculación y Cierre Pedagógico Exclusivo
    if nuevo_estado == 'Finalizada' and not observaciones:
        conn.close()
        return jsonify({'error': 'Las observaciones pedagógicas son obligatorias para finalizar la tutoría'}), 400
        
    cursor.execute('''
        UPDATE tutorias 
        SET estado = ?, observaciones = ?
        WHERE id = ?
    ''', (nuevo_estado, observaciones if nuevo_estado == 'Finalizada' else tutoria['observaciones'], tutoria_id))
    
    # If rejected, reset availability state to 'Libre'
    if nuevo_estado == 'Rechazada':
        cursor.execute('UPDATE disponibilidades SET estado = \'Libre\' WHERE id = ?', (tutoria['disponibilidad_id'],))
        
    conn.commit()
    conn.close()
    
    return jsonify({'message': f'Tutoría actualizada a {nuevo_estado}'}), 200

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
