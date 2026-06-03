# Especificación de Requerimientos y Priorización (MoSCoW)

## 1. Clasificación de Requerimientos Funcionales (Matriz MoSCoW)

A continuación, se agrupan los requerimientos según su grado de criticidad para el despliegue del software. Se pone especial foco en los procesos CRUD requeridos según el Software_Project_Brief.pdf.

### Tabla de Requerimientos Funcionales

| Prioridad                 | Código        | Requerimiento / Criterio de Aceptación                                                                                   |
|                           |               |

| Must-Have (Obligatorio)   | RF-01 (CRUD)  | Gestión de Usuarios: registrar, iniciar sesión y      autenticar usuarios con segregación estricta de roles Estudiante y Docente. |

| Must-Have (Obligatorio)   | RF-02         | Registro de Disponibilidad: el Docente registra bloques de horario con id, fecha, horaInicio, horaFin y el estado inicial 'Libre'. |

| Must-Have (Obligatorio)   | RF-03 (CRUD)  | Solicitud de Tutoría: el Estudiante consulta bloques disponibles en tiempo real, selecciona fecha/hora, detalla el motivo académico y guarda la solicitud como 'Pendiente'. |

| Must-Have (Obligatorio)   | RF-04         | Gestión de Solicitudes (Bandeja): el Docente recibe las solicitudes entrantes y puede cambiar su estado a 'Confirmada' o 'Rechazada'. |

| Must-Have (Obligatorio)   | RF-05 (CRUD)  | Asignación, Seguimiento y Cierre: el Docente registra las observaciones pedagógicas y actualiza el estado final a 'Finalizada'. |

| Should-Have (Deseable)    | RF-06         | Visualización de Historial: Estudiantes y Docentes revisan el histórico completo de sus tutorías pasadas, agrupadas por estado. |

| Should-Have (Deseable)    | RF-07         | Alertas en la Plataforma: notificaciones internas que avisen al estudiante cuando un docente acepte o rechace una solicitud. |

| Could-Have (Opcional)     | RF-08         | Filtros Avanzados de Búsqueda: el estudiante puede buscar agendas disponibles por especialidad, nombre o rango de fechas. |

| Could-Have (Opcional)     | RF-09         | Exportación de Reporte Académico: el estudiante descarga un comprobante digital imprimible con el resumen y observaciones de su tutoría concluida. |

| Won't-Have (Excluido)     | RF-10         | Videoconferencia Nativa Integrada: no se implementará comunicación por video síncrona dentro de la plataforma en este ciclo. |

| Won't-Have (Excluido)     | RF-11         | Sincronización con Google Calendar: la integración bidireccional con agendas externas queda fuera del alcance del MVP. |

## 2. Requerimientos No Funcionales (RNF)

- **RNF-01: Seguridad y Control de Acceso** — El sistema debe implementar cifrado en la persistencia de contraseñas de usuarios. Asimismo, debe validar rigurosamente la sesión activa en el servidor, impidiendo que un usuario con rol de Estudiante ejecute métodos exclusivos del rol Docente (como registrarDisponibilidad o actualizarEstado).
- **RNF-02: Diseño Adaptable (Responsive Web Design)** — La interfaz gráfica de usuario debe estructurarse mediante layouts fluidos que aseguren una navegación y visualización óptima tanto en computadores de escritorio como en smartphones, facilitando la consulta ágil de horarios en entornos móviles.
- **RNF-03: Persistencia e Integridad de Datos** — La base de datos relacional debe asegurar la integridad referencial en todo su ciclo de vida. Queda restringida la eliminación lógica o física de un bloque de Disponibilidad si este ya se encuentra indexado a una Tutoría en estado 'Pendiente' o 'Confirmada'.
- **RNF-04: Manejo de Errores Dinámico y Usabilidad** — De acuerdo con el modelado de negocio, el sistema web debe reaccionar de forma síncrona/asíncrona ante la falta de cupos; si el estudiante intenta acceder a un docente sin bloques libres, la interfaz debe truncar la petición y desplegar de manera explícita el mensaje 'Sin disponibilidad'.

## 3. Requerimientos de Dominio y Reglas de Negocio

- **RD-01: Restricción de Solicitud Unívoca por Bloque** — Un Estudiante tiene estrictamente prohibido registrar o agendar dos tutorías que colisionen en el mismo bloque de fecha y hora, garantizando que el estudiante no duplique esfuerzos ni reserve espacios que no pueda atender.
- **RD-02: Ciclo de Vida Determinista de la Tutoría** — Toda tutoría creada en la base de datos debe cumplir el flujo secuencial obligatorio de estados modelado en el diagrama de actividades: Pendiente → Confirmada / Rechazada → Finalizada. No se permiten saltos de estado inválidos (ej. de Pendiente directo a Finalizada sin confirmación previa del docente).
- **RD-03: Vinculación y Cierre Pedagógico Exclusivo** — El cambio de estado de una tutoría a 'Finalizada' está condicionado y bloqueado a nivel de backend hasta que el Docente guarde texto en el campo 'observaciones'. No se admiten cierres de tutorías con campos de diagnóstico pedagógico vacíos.

## 4. Hoja de Ruta Sugerida para el Squad (Plan de Sprints)

Basado en el enfoque de Aprendizaje Basado en Proyectos (ABP) y considerando la limitación temporal estricta de 2 Clases / Sprints, se recomienda al equipo la siguiente segmentación de carga de trabajo para asegurar el cumplimiento del Dashboard de Entrega:

- **Clase 1 / Sprint 1 (Arquitectura y Línea Base):** Consolidación de este documento de requerimientos, diseño final de diagramas de Casos de Uso, Clases y Flujo, inicialización del repositorio Git institucional con la estructura de carpetas estándar y el archivo README.md inicial.
- **Clase 2 / Sprint 2 (Desarrollo MVP y QA):** Codificación intensiva centrada de forma exclusiva en los requerimientos calificados como Must-Have (RF-01 a RF-05). Ejecución de pruebas funcionales (Caja Negra) basadas en el flujo de aceptación/rechazo y despliegue del prototipo funcional para la demo técnica final ante el cliente.

## Diagramas UML (Casos de Uso, Clases, Flujo)

1. Diagrama de casos de uso
2. Diagrama de clases
3. Diagrama de Flujo
