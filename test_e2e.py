import time
import json
import os
from app import app, init_db, DATABASE

def run_test():
    start_time = time.time()
    
    # Reset/init database for clean run
    if os.path.exists(DATABASE):
        try:
            os.remove(DATABASE)
        except PermissionError:
            pass
    init_db()
    
    client = app.test_client()
    
    # 1. Login Docente
    login_resp = client.post('/api/auth/login',
                             data=json.dumps({'email': 'docente@prueba.com', 'password': 'password123'}),
                             content_type='application/json')
    if login_resp.status_code != 200:
        print("ERROR: No se pudo iniciar sesión como Docente.")
        return
        
    print("creando tutoria")
    time.sleep(0.5)
    
    # 2. Docente creates availability (tutoring block)
    disp_resp = client.post('/api/docente/disponibilidad',
                            data=json.dumps({
                                'fecha': '2026-06-12',
                                'hora_inicio': '14:00',
                                'hora_fin': '15:00'
                            }),
                            content_type='application/json')
    if disp_resp.status_code != 201:
        print("ERROR: No se pudo crear la disponibilidad del docente.")
        return
        
    print("tutoria creada")
    time.sleep(0.4)
    
    # Logout Docente
    client.post('/api/auth/logout')
    
    # 3. Register & Login Estudiante
    reg_resp = client.post('/api/auth/register',
                           data=json.dumps({
                               'nombres': 'Ada',
                               'apellidos': 'Lovelace',
                               'email': 'estudiante.test@prueba.com',
                               'password': 'password123',
                               'rol': 'Estudiante',
                               'matricula': 'A09876543',
                               'carrera': 'Ingeniería Mecatrónica'
                           }),
                           content_type='application/json')
    if reg_resp.status_code != 201:
        print("ERROR: No se pudo registrar al estudiante.")
        return
        
    login_est_resp = client.post('/api/auth/login',
                                 data=json.dumps({'email': 'estudiante.test@prueba.com', 'password': 'password123'}),
                                 content_type='application/json')
    if login_est_resp.status_code != 200:
        print("ERROR: No se pudo iniciar sesión como Estudiante.")
        return
        
    # Get availability block ID
    get_disp_resp = client.get('/api/docente/disponibilidades')
    availabilities = json.loads(get_disp_resp.data)
    if not availabilities:
        print("ERROR: No se encontraron tutorías disponibles.")
        return
    disp_id = availabilities[0]['id']
    docente_nombre = availabilities[0]['docente_nombre']
    
    print(f"estudiante matricualandose a la tutoria tal")
    time.sleep(0.5)
    
    # 4. Estudiante requests tutoring (enrolls/subscribes)
    req_resp = client.post('/api/tutorias',
                           data=json.dumps({
                               'disponibilidad_id': disp_id,
                               'motivo': 'Apoyo con temas de álgebra lineal'
                           }),
                           content_type='application/json')
    if req_resp.status_code != 201:
        print("ERROR: No se pudo matricular en la tutoría.")
        return
        
    print("inscripcion completa")
    
    end_time = time.time()
    elapsed = end_time - start_time
    
    print(f"TEST COMPLETADO tiempo de test, {elapsed:.2f}sec")

if __name__ == '__main__':
    run_test()
