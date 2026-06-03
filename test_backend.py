import unittest
import os
import sqlite3
import json
from app import app, init_db, DATABASE

class AcademicTutoringTestCase(unittest.TestCase):
    def setUp(self):
        # Configure app for testing
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test-secret-key'
        self.client = app.test_client()
        
        # Fresh database for testing
        if os.path.exists(DATABASE):
            try:
                os.remove(DATABASE)
            except PermissionError:
                pass
        init_db()

    def tearDown(self):
        # Clean up database
        if os.path.exists(DATABASE):
            try:
                os.remove(DATABASE)
            except PermissionError:
                pass

    def register_user(self, nombre, email, password, rol, **kwargs):
        payload = {
            'nombre': nombre,
            'email': email,
            'password': password,
            'rol': rol,
            **kwargs
        }
        return self.client.post('/api/auth/register', 
                                data=json.dumps(payload),
                                content_type='application/json')

    def login_user(self, email, password):
        payload = {'email': email, 'password': password}
        return self.client.post('/api/auth/login',
                                data=json.dumps(payload),
                                content_type='application/json')

    def test_workflow(self):
        # 1. Register Docente
        resp = self.register_user(
            nombre="Dr. Alan Turing",
            email="turing@university.edu",
            password="securepassword123",
            rol="Docente",
            especialidad="Algoritmos y Computabilidad",
            cubiculo="Cubiculo 101"
        )
        self.assertEqual(resp.status_code, 201)
        
        # 2. Register Estudiante
        resp = self.register_user(
            nombre="Ada Lovelace",
            email="ada@university.edu",
            password="studentpassword123",
            rol="Estudiante",
            matricula="A00123456",
            carrera="Ingeniería en Computación"
        )
        self.assertEqual(resp.status_code, 201)

        # 3. Log in as Docente
        resp = self.login_user("turing@university.edu", "securepassword123")
        self.assertEqual(resp.status_code, 200)
        
        # 4. Create Availability Block (Docente)
        resp = self.client.post('/api/docente/disponibilidad',
                                data=json.dumps({
                                    'fecha': '2026-06-10',
                                    'hora_inicio': '10:00',
                                    'hora_fin': '11:00'
                                }),
                                content_type='application/json')
        self.assertEqual(resp.status_code, 201)
        
        # Logout Docente
        self.client.post('/api/auth/logout')
        
        # 5. Log in as Estudiante
        resp = self.login_user("ada@university.edu", "studentpassword123")
        self.assertEqual(resp.status_code, 200)
        
        # Get availabilities as Estudiante
        resp = self.client.get('/api/docente/disponibilidades')
        self.assertEqual(resp.status_code, 200)
        availabilities = json.loads(resp.data)
        self.assertTrue(len(availabilities) > 0)
        disp_id = availabilities[0]['id']
        
        # 6. Request Tutoring Session (Estudiante)
        resp = self.client.post('/api/tutorias',
                                data=json.dumps({
                                    'disponibilidad_id': disp_id,
                                    'motivo': 'Consulta sobre la Máquina de Turing Universal'
                                }),
                                content_type='application/json')
        self.assertEqual(resp.status_code, 201)
        
        # RD-01 Check: Requesting another tutoring in the same slot should fail
        resp = self.client.post('/api/tutorias',
                                data=json.dumps({
                                    'disponibilidad_id': disp_id,
                                    'motivo': 'Consulta duplicada'
                                }),
                                content_type='application/json')
        self.assertEqual(resp.status_code, 400) # Expect failure due to duplicate slot reservation or already booked availability
        
        # Logout Estudiante
        self.client.post('/api/auth/logout')
        
        # 7. Log in as Docente to review requests
        self.login_user("turing@university.edu", "securepassword123")
        
        # Get received tutoring requests
        resp = self.client.get('/api/tutorias')
        self.assertEqual(resp.status_code, 200)
        tutorias = json.loads(resp.data)
        self.assertEqual(len(tutorias), 1)
        tutoria_id = tutorias[0]['id']
        self.assertEqual(tutorias[0]['estado'], 'Pendiente')
        
        # RD-02 Check: Invalid state transition (cannot jump to Finalizada directly from Pendiente)
        resp = self.client.put(f'/api/tutorias/{tutoria_id}/estado',
                                data=json.dumps({
                                    'estado': 'Finalizada',
                                    'observaciones': 'Algún diagnóstico'
                                }),
                                content_type='application/json')
        self.assertEqual(resp.status_code, 400) # Bad Request
        
        # 8. Accept tutoring request (Pendiente -> Confirmada)
        resp = self.client.put(f'/api/tutorias/{tutoria_id}/estado',
                                data=json.dumps({'estado': 'Confirmada'}),
                                content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        
        # RD-03 Check: Finalizing without observations should fail
        resp = self.client.put(f'/api/tutorias/{tutoria_id}/estado',
                                data=json.dumps({
                                    'estado': 'Finalizada'
                                }),
                                content_type='application/json')
        self.assertEqual(resp.status_code, 400)
        
        # 9. Finalize tutoring request with observations (Confirmada -> Finalizada)
        resp = self.client.put(f'/api/tutorias/{tutoria_id}/estado',
                                data=json.dumps({
                                    'estado': 'Finalizada',
                                    'observaciones': 'Se repasó la teoría del problema de la parada. El estudiante demostró buena comprensión.'
                                }),
                                content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        
        # Verify the state is indeed Finalizada
        resp = self.client.get('/api/tutorias')
        tutorias_final = json.loads(resp.data)
        self.assertEqual(tutorias_final[0]['estado'], 'Finalizada')
        self.assertEqual(tutorias_final[0]['observaciones'], 'Se repasó la teoría del problema de la parada. El estudiante demostró buena comprensión.')

if __name__ == '__main__':
    unittest.main()
