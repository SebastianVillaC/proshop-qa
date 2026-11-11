# 2. Plan de pruebas — ProShop v2

> Estructura basada en **IEEE 829-2008** (Test Plan) y en **ISO/IEC/IEEE 29119-3** (documentación de pruebas).
> Identificador del documento: **PP-PROSHOP-01** · Versión 1.0 · Noviembre de 2026

## 2.1 Identificación e introducción

Este documento define el enfoque, los recursos y el cronograma de las actividades de prueba sobre **ProShop v2**, un e-commerce MERN cuyo código está en `app/`. Sirve de guía a las tres personas del equipo y es la base contra la que se miden los resultados del informe final.

**Referencias:** `docs/01-contexto-y-requisitos.md` (RF y RNF), OWASP Top 10 2021, ISO/IEC 25010 e ISO/IEC/IEEE 29119.

## 2.2 Objetivos de prueba

| ID | Objetivo |
|---|---|
| OBJ-1 | Verificar que las funcionalidades RF01–RF09 cumplen sus criterios de aceptación. |
| OBJ-2 | Detectar defectos en las reglas de negocio (precios, stock, calificaciones) aplicando partición de equivalencia, valores límite y tablas de decisión. |
| OBJ-3 | Construir una suite automatizada y repetible (unitaria, de integración y E2E) que sirva como red de regresión e integrarla en un pipeline de CI. |
| OBJ-4 | Evaluar el rendimiento de la API bajo carga (RNF01 y RNF02) e identificar su punto de degradación. |
| OBJ-5 | Evaluar la seguridad según OWASP Top 10 combinando SAST (SonarQube), DAST (OWASP ZAP), auditoría de dependencias y pruebas manuales dirigidas. |
| OBJ-6 | Medir la calidad interna (mantenibilidad, duplicación y cobertura) y definir KPIs para tomar decisiones. |

## 2.3 Alcance

**Elementos de prueba:** API REST del backend (`app/backend`), interfaz web SPA (`app/frontend`) y base de datos MongoDB. La versión es el commit `e23e3a8` del upstream, con el refactor de testabilidad descrito en el README.

**Dentro del alcance:**

- Funcionalidades: autenticación, registro, perfil, catálogo y búsqueda, carrito y checkout, cálculo de precios, reseñas, administración de productos, carga de imágenes, administración de usuarios y pedidos, y control de acceso por rol.
- Atributos no funcionales: rendimiento y estabilidad de la API, usabilidad y accesibilidad del frontend, seguridad y mantenibilidad.

**Fuera del alcance (y por qué):**

| Elemento | Justificación |
|---|---|
| Pago real con PayPal (`PUT /api/orders/:id/pay`) | Requiere credenciales y la disponibilidad del sandbox de PayPal, que es un servicio externo. Se prueba hasta la creación del pedido. |
| Compatibilidad entre navegadores | Solo se usa Chromium por limitación de tiempo. Firefox y WebKit quedan como mejora. |
| Despliegue en producción e infraestructura | El sistema se prueba en un ambiente local controlado con Docker. |
| Pruebas de recuperación ante desastres o backups de MongoDB | No forman parte de la funcionalidad de la aplicación. |

## 2.4 Niveles y tipos de prueba

| Nivel | Qué se prueba | Herramienta | Responsable | Ubicación |
|---|---|---|---|---|
| **Unitarias** | Funciones aisladas: `calcPrices`, `generateToken` y los middlewares `checkObjectId`, `admin` y `errorHandler` | Jest 29 | Sebastián Villa | `tests/unit/` |
| **Integración** | Endpoints REST con middlewares, controladores, modelos y MongoDB (en memoria) | Jest, Supertest y mongodb-memory-server | Sebastián Villa | `tests/integration/` |
| **Sistema** | Flujos de punta a punta en la interfaz, pruebas no funcionales y de seguridad sobre el sistema desplegado | Playwright, k6, Lighthouse, ZAP y pruebas manuales | Jhon Eduardo Zabala Garzon e Robin Alexander Montoya Velasquez | `tests/e2e/`, `tests/performance/`, `security/` |
| **Aceptación** | Verificación de los criterios de aceptación (§1.7) mediante los casos manuales CP-01 a CP-14, desde la perspectiva del usuario | Ejecución manual con evidencia | Jhon Eduardo Zabala Garzon | `docs/03-casos-de-prueba.md` |

## 2.5 Estrategias de prueba

| Estrategia | Aplicación en el proyecto | Justificación |
|---|---|---|
| **Funcionales (caja negra)** | Casos manuales y E2E sobre RF01–RF09, y pruebas de API por contrato (códigos HTTP y cuerpos) | Validan el comportamiento observable contra los requisitos sin depender de la implementación. |
| **Estructurales (caja blanca)** | Pruebas unitarias guiadas por el código, con cobertura de sentencias y ramas (Jest v8) | Aseguran que las ramas de la lógica crítica (precios, autorización) se ejercitan. |
| **No funcionales** | Carga y estrés (k6), Lighthouse (rendimiento, accesibilidad y buenas prácticas), vista móvil y análisis estático de mantenibilidad (SonarQube) | Los RNF01–RNF09 no se pueden verificar con pruebas funcionales. |
| **Exploratorias** | Sesiones guiadas por charters (abajo) contra la API con curl y el navegador. Los hallazgos se convierten en casos formales y pruebas automatizadas | ProShop no tiene especificación formal y la exploración permite descubrir los requisitos implícitos y los defectos de borde. |
| **Automatizadas** | Unitarias, de integración, E2E, rendimiento y DAST, ejecutables por comandos y en CI | Permiten regresión rápida y repetible, y son la base del pipeline. |
| **Basadas en riesgo** | Se priorizan los módulos con dinero (checkout), datos personales (pedidos y perfil) y privilegios (admin) | Concentra el esfuerzo donde un defecto tiene más impacto. |
| **Seguridad** | SAST, DAST, `npm audit` y pruebas manuales dirigidas por OWASP Top 10 (`security/owasp-checks.mjs`) | Las herramientas automáticas no detectan fallas de control de acceso ni de lógica de negocio. |

**Charters de prueba exploratoria (sesiones de 30 minutos):**

| Charter | Objetivo | Hallazgos |
|---|---|---|
| EXP-1 | Explorar la API de pedidos con cantidades y precios manipulados | DEF-01, DEF-04 |
| EXP-2 | Explorar el control de acceso entre dos clientes y el rol admin | DEF-02, DEF-03 |
| EXP-3 | Explorar entradas inválidas y caracteres especiales en búsqueda, ids y registro | DEF-07, DEF-08, DEF-09, DEF-10 |
| EXP-4 | Explorar la autenticación: operadores NoSQL, fuerza bruta y logout | DEF-11, DEF-13, DEF-15 |

## 2.6 Técnicas de diseño de pruebas

| Técnica | Dónde se aplica | Ejemplo |
|---|---|---|
| **Partición de equivalencia (PE)** | Login (credenciales válidas / contraseña incorrecta / email inexistente / vacío), búsqueda (con resultados / sin resultados / caracteres especiales), carga de archivos (imagen permitida / extensión inválida / mimetype falso) | CP-02, CP-05, CP-11, `users.api.test.js` |
| **Valores límite (VL)** | Envío gratis (99.99 / 100.00 / 100.01), calificación (0 / 1 / 5 / 6), cantidad (0 / 1 / stock / stock+1), longitud de contraseña (5 / 6), página (-1 / 0 / 1 / 2), precio y stock (-0.01 / 0) | CP-03, CP-06, CP-07, CP-10, `calcPrices.test.js` |
| **Tabla de decisión** | Costo de envío e IVA según el subtotal. Autorización según usuario autenticado × rol × dueño del recurso | CP-07, CP-13, `middleware.test.js` |
| **Transición de estados** | Ciclo del pedido: creado (no pagado, no entregado) → entregado (admin). Sesión: anónimo → autenticado → logout | E2E-08, `orders.api.test.js` |
| **Adivinanza de errores** | Inyección de regex y operadores NoSQL, ids mal formados, campos faltantes | DEF-09, DEF-10, DEF-15 |

**Tabla de decisión: costo de envío (RF06)**

| Condición / Regla | R1 | R2 | R3 |
|---|---|---|---|
| Carrito vacío | Sí | No | No |
| Subtotal > 100 | — | No | Sí |
| **Acción:** envío | 10.00 | 10.00 | 0.00 |
| **Acción:** IVA | 0.00 | 15 % del subtotal | 15 % del subtotal |
| Caso de prueba | `calcPrices` vacío | CP-07 (99.98), VL 99.99 y 100.00 | CP-07 (149.97), VL 100.01 |

**Tabla de decisión: acceso a un pedido (RF07)**

| Condición | R1 | R2 | R3 | R4 |
|---|---|---|---|---|
| Autenticado | No | Sí | Sí | Sí |
| Es admin | — | Sí | No | No |
| Es dueño del pedido | — | — | Sí | No |
| **Resultado esperado** | 401 | 200 | 200 | 403/404 |
| **Resultado obtenido** | 401 ✅ | 200 ✅ | 200 ✅ | **200 ❌ (DEF-02)** |

## 2.7 Criterios de entrada, salida y suspensión

| Tipo | Criterio |
|---|---|
| **Entrada** | La app levanta con `npm run app:dev`, la BD está sembrada (`npm run app:seed`), los requisitos están documentados y las herramientas instaladas (Docker, Node). |
| **Salida** | 100 % de los casos diseñados ejecutados, todo defecto registrado con severidad y prioridad, informes de herramientas exportados a `evidencias/` y KPIs calculados. |
| **Suspensión** | La app no arranca, la BD está corrupta, o un defecto bloqueante impide más del 30 % de los casos. |
| **Reanudación** | Se corrige o rodea el bloqueo, se vuelve a sembrar la BD y se reejecutan los casos afectados. |

## 2.8 Recursos

**Humanos**

| Integrante | Rol | Responsabilidades |
|---|---|---|
| Sebastián Villa | QA Lead técnico / Automatización backend | Ambiente, requisitos, pruebas unitarias y de integración, SonarQube y métricas |
| Jhon Eduardo Zabala Garzon | Test Designer / Automatización UI | Plan de pruebas, diseño y ejecución de casos manuales, Playwright y pipeline CI/CD |
| Robin Alexander Montoya Velasquez | Ingeniero de rendimiento y seguridad | k6, Lighthouse, OWASP ZAP, análisis OWASP Top 10 y gestión de defectos |

**Herramientas**

| Herramienta | Versión | Uso |
|---|---|---|
| Jest + Supertest | 29.x / 7.x | Pruebas unitarias y de integración, y cobertura |
| mongodb-memory-server | 10.x | BD aislada para integración |
| Playwright | 1.x (Chromium) | Pruebas E2E, capturas, video y trazas |
| k6 (Docker `grafana/k6`) | latest | Pruebas de humo, carga y estrés |
| Lighthouse | 12.x | Rendimiento y accesibilidad del frontend |
| SonarQube Community (Docker) | 26.x | Análisis estático y quality gate |
| OWASP ZAP (Docker `zaproxy/zap-stable`) | estable | DAST: baseline y escaneo activo de la API |
| npm audit | npm 11 | Auditoría de dependencias (A06) |
| GitHub Issues + Projects | — | Gestión de defectos |
| GitHub Actions | — | Integración continua |

**Ambientes**

| Ambiente | Descripción |
|---|---|
| Local de pruebas | macOS / Windows / Linux, Node 24, Docker Desktop. MongoDB 7 en contenedor, backend en :5001 y frontend (CRA dev) en :3000 |
| Integración aislado | MongoDB en memoria, levantado por cada suite de Jest |
| CI | `ubuntu-latest` en GitHub Actions con un servicio MongoDB 7 |
| Producción simulada | Build de producción servido por Express (`NODE_ENV=production`), usado para Lighthouse |

**Datos de prueba:** semilla de ProShop (`app/backend/data`) con 3 usuarios (1 admin y 2 clientes) y 6 productos con precios de 29.99 a 929.99 y stock de 0 a 11. Se resiembra antes de cada ejecución E2E y de seguridad.

## 2.9 Cronograma

| # | Actividad | Responsable | Inicio | Fin | Entregable |
|---|---|---|---|---|---|
| 1 | Selección del sistema, ambiente Docker e importación del código | Sebastián Villa | 08-nov | 08-nov | Repositorio y `docker-compose.yml` |
| 2 | Plan de pruebas y matriz de trazabilidad | Jhon Eduardo Zabala Garzon | 08-nov | 09-nov | `docs/02`, `docs/04` |
| 3 | Proceso de gestión de defectos y plantillas | Robin Alexander Montoya Velasquez | 08-nov | 09-nov | `.github/ISSUE_TEMPLATE`, `docs/08` |
| 4 | Contexto, requisitos y criterios de aceptación | Sebastián Villa | 09-nov | 10-nov | `docs/01` |
| 5 | Pruebas exploratorias (EXP-1 a EXP-4) | Todos | 10-nov | 11-nov | Defectos iniciales |
| 6 | Pruebas unitarias y de integración | Sebastián Villa | 10-nov | 13-nov | `tests/unit`, `tests/integration` |
| 7 | Diseño y ejecución de casos manuales | Jhon Eduardo Zabala Garzon | 10-nov | 13-nov | `docs/03`, `evidencias/manuales` |
| 8 | Pruebas de rendimiento y Lighthouse | Robin Alexander Montoya Velasquez | 11-nov | 13-nov | `tests/performance`, `evidencias/k6` |
| 9 | Automatización E2E con Playwright | Jhon Eduardo Zabala Garzon | 14-nov | 17-nov | `tests/e2e` |
| 10 | Análisis estático con SonarQube | Sebastián Villa | 14-nov | 16-nov | `evidencias/sonarqube` |
| 11 | DAST con OWASP ZAP, npm audit y verificaciones OWASP | Robin Alexander Montoya Velasquez | 14-nov | 17-nov | `security/`, `evidencias/zap`, `docs/06` |
| 12 | Pipeline CI/CD | Jhon Eduardo Zabala Garzon | 18-nov | 19-nov | `.github/workflows/ci.yml` |
| 13 | Registro de defectos, corrección de DEF-02 y verificación | Robin Alexander Montoya Velasquez | 18-nov | 19-nov | Issues y `docs/08` |
| 14 | KPIs y métricas de calidad | Sebastián Villa | 18-nov | 19-nov | `docs/07` |
| 15 | Consolidación del informe, reflexión y anexos | Todos | 20-nov | 21-nov | Informe PDF |
| 16 | Entrega en Teams | Sebastián Villa | 22-nov | 22-nov | PDF |

## 2.10 Riesgos del plan

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| La versión de Node o de dependencias impide levantar la app | Media | Alto | Usar `package-lock.json`, documentar la versión de Node y la infraestructura en Docker |
| El puerto 5000 está ocupado (AirPlay en macOS) | Alta | Medio | Usar el backend en :5001 (ya aplicado) |
| Pruebas E2E inestables (flaky) | Media | Medio | Selectores por rol y label, ejecución serial, reintento en CI y reseed en `globalSetup` |
| El escaneo activo de ZAP modifica datos | Alta | Bajo | Escanear con un usuario no admin y resembrar después |
| Disponibilidad desigual de los integrantes | Media | Alto | Trabajo dividido en paquetes por ronda con instrucciones exactas |

## 2.11 Entregables de prueba

Plan de pruebas (este documento), casos de prueba y matriz de trazabilidad, scripts automatizados (`tests/`, `security/`), reportes exportados (`evidencias/`), registro de defectos (GitHub Issues y `docs/08`), análisis de seguridad (`docs/06`), métricas (`docs/07`) e informe final en PDF.
