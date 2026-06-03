## **JUSTIFICACIÓN METODOLÓGICA: IMPLEMENTACIÓN DE KANBAN** 

## **1. ¿El Qué? (Definición de la Metodología)** 

Para el desarrollo del **Sistema Web de Gestión de Tutorías Académicas** , se implementará la metodología ágil **Kanban** . Esta es una metodología de gestión visual enfocada en el desarrollo evolutivo y el flujo continuo de trabajo. A diferencia de otros marcos rígidos, Kanban no divide el tiempo en bloques cerrados (Sprints), sino que organiza el ciclo de vida del software en un tablero visual dinámico, donde las tareas avanzan de forma lineal a través de estados claros (Por Hacer, En Progreso, En Pruebas y Hecho). 

## **2. ¿Por qué? (Razones de la elección)** 

La elección de Kanban se fundamenta en tres razones técnicas basadas en el diseño previo del proyecto ("PROYECTO, SISTEMA WEB DE GESTION DE TUTORIAS ACADEMICAS.pdf"): 

- **Baja Incertidumbre y Requisitos Definidos:** Los diagramas de Casos de Uso, Clases y Flujo ya definen con precisión el comportamiento, las entidades (Usuario, Docente, Estudiante, Tutoría) y las reglas de negocio del sistema. Al no haber ambigüedad en lo que se debe construir, no se requiere la constante planeación y redefinición que exige Scrum; solo se necesita ejecutar el plan de forma eficiente. 

- **Mapeo Directo del Proceso:** El flujo del sistema (Solicitar Tutoría, Validar Disponibilidad, Evaluar Estado, Registrar Observaciones) es una secuencia lógica que se traslada de manera idéntica a las columnas de un tablero Kanban. Esto permite que el desarrollo del código imite el comportamiento real del software. 

- **Optimización del Tiempo del Equipo:** Al ser un proyecto con recursos y disponibilidad de tiempo variables, Kanban elimina la burocracia y las reuniones excesivas, permitiendo al equipo avanzar a su propio ritmo sin la presión artificial de entregar un paquete cerrado de software en fechas fijas, evitando así el cuello de botella. 

## **3. ¿Para qué? (Objetivos y Beneficios Esperados)** 

La metodología se implementa con los siguientes objetivos prácticos: 

- **Para evitar la sobrecarga de trabajo (Control de WIP):** Al limitar el número de tareas simultáneas en la columna "En Progreso", el equipo se ve obligado a terminar el módulo que está programando antes de iniciar uno 

nuevo. Esto asegura que el sistema se construya con calidad y sin dejar código a medias. 

- **Para garantizar la trazabilidad de los diagramas:** Sirve para asegurar que cada clase del diagrama y cada paso del flujo se conviertan en una tarjeta visual rastreable. Así, cualquier integrante o evaluador puede ver exactamente qué porcentaje del PDF ya se encuentra programado y probado en tiempo real. 

- **Para maximizar la eficiencia en las entregas:** Para lograr un flujo continuo donde las funciones validadas (como el "Registro de Usuarios" o la "Solicitud de Tutoría") queden operativas e integradas de inmediato, garantizando un producto funcional, ordenado y fiel a la arquitectura planificada. 

## Diagrama metodológico 

