# Sistema Web de Gestión de Tutorías Académicas

Este es el Producto Mínimo Viable (MVP) para la plataforma web de gestión y registro de tutorías académicas. Conecta de forma ágil y segura a estudiantes y docentes, estructurando todo el ciclo de vida de la tutoría académica y garantizando su cierre pedagógico.

El sistema cuenta con un diseño minimalista, profesional, responsive y sin emojis para asegurar una estética corporativa y limpia.

---

## Características Principales

1. **Gestión de Usuarios con Roles**: Inicio de sesión seguro con roles diferenciados: **Estudiante** y **Docente**. El registro público está restringido a estudiantes (los docentes se pre-cargan en la base de datos o se crean internamente por seguridad).
2. **Registro de Disponibilidad**: Los docentes pueden definir y registrar bloques de horario (fecha, hora de inicio, hora de fin) con estado inicial `Libre`.
3. **Solicitud de Tutorías**: Los estudiantes buscan bloques disponibles en tiempo real con filtros avanzados (por docente o especialidad) y solicitan la tutoría detallando el motivo.
4. **Bandeja de Aceptación/Rechazo**: Los docentes pueden confirmar o rechazar las tutorías recibidas.
5. **Cierre Pedagógico Obligatorio**: Al completarse la sesión de tutoría, el docente registra las observaciones académicas para poder marcarla como `Finalizada`.
6. **Reporte Imprimible**: Generación de un comprobante digital limpio en formato imprimible con el resumen, diagnóstico y recomendaciones de la tutoría.

---

## Reglas de Negocio Incorporadas

- **RD-01 (Solicitud Única por Bloque)**: Un estudiante tiene prohibido agendar dos tutorías activas (pendientes o confirmadas) que coincidan en el mismo bloque de fecha y hora.
- **RD-02 (Ciclo de Vida Determinista)**: Toda tutoría debe seguir estrictamente la secuencia de estados: `Pendiente` $\rightarrow$ `Confirmada` / `Rechazada` $\rightarrow$ `Finalizada`. No se permiten saltos inválidos.
- **RD-03 (Cierre Pedagógico Exclusivo)**: El cambio al estado `Finalizada` está bloqueado hasta que el docente ingrese texto descriptivo en el campo de observaciones.
- **RNF-03 (Integridad de Datos)**: No se permite eliminar ni alterar un bloque de disponibilidad si este ya se encuentra indexado a una tutoría en estado `Pendiente` o `Confirmada`.

---

## Documentación del Proyecto

El archivo original de requerimientos y priorización está disponible y es descargable directamente en el repositorio:
*   [Requerimientos y Priorización de Tutorías Académicas (DOCX)](https://github.com/SoyPhilips/sistema-gestion-tutorias-academicas/raw/main/docs/Requerimientos_y_Priorizacion_Tutorias_Academicas.docx)
*   [Manual de Usuario (DOCX)](https://github.com/SoyPhilips/sistema-gestion-tutorias-academicas/raw/main/docs/Manual_de_Usuario.docx)

---

## Requisitos de Instalación

El proyecto requiere **Python 3.10+** y la biblioteca **Flask** instalada.

1. Instalar dependencias necesarias:
   ```bash
   pip install Flask Werkzeug
   ```

2. Ejecutar el servidor web local:
   ```bash
   python app.py
   ```

3. Acceder al sistema en tu navegador ingresando a:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

### Credencial de Docente de Prueba
Para pruebas de flujos de aceptación y cierre pedagógico, el sistema auto-genera la siguiente credencial de docente al arrancar:
- **Email**: `docente@prueba.com`
- **Contraseña**: `password123`

---

## Ejecución de Pruebas Unitarias

El proyecto cuenta con un set completo de pruebas unitarias y de integración en el backend para validar las reglas del negocio de manera automatizada:

```bash
python test_backend.py
```
