# 9. Automatización de pruebas e integración continua

## 9.1 Herramientas y lenguajes

| Nivel | Herramienta | Lenguaje | Por qué se eligió |
|---|---|---|---|
| Unitarias e integración | **Jest 29** + **Supertest** + **mongodb-memory-server** | JavaScript (ES Modules) | Es el mismo lenguaje del SUT y Supertest monta la app Express sin abrir puertos. MongoDB en memoria da aislamiento y velocidad: 91 pruebas en unos 9 s. |
| E2E (interfaz) | **Playwright** (Chromium) | JavaScript (CommonJS) | Espera automáticamente a los elementos, usa selectores accesibles (`getByRole`, `getByLabel`) y genera capturas, video, trazas y reportes HTML y JUnit sin configuración extra. |
| Rendimiento | **k6** (Docker) | JavaScript | Scripts versionables, umbrales declarativos (pass o fail) y se ejecuta en Docker sin instalar nada. |
| Seguridad DAST | **OWASP ZAP** (Docker) | Configuración CLI + OpenAPI | Es el estándar abierto de OWASP y tiene modos baseline (para CI) y escaneo activo de API. |
| Seguridad dirigida | `security/owasp-checks.mjs` | JavaScript (Node 20+, `fetch`) | Automatiza las verificaciones de control de acceso y lógica de negocio que ZAP no cubre. |

## 9.2 Descripción de los scripts

```
tests/
├── helpers/            env.js (variables de prueba) · db.js (Mongo en memoria + semilla) · auth.js (login → cookie)
├── unit/               calcPrices · generateToken · middleware (checkObjectId, admin, errorHandler)
├── integration/        users.api · products.api · orders.api · upload.api
├── e2e/
│   ├── playwright.config.js   reporters html/junit/json, capturas siempre, traza y video si falla
│   ├── global-setup.js        resiembra la BD antes de la suite
│   └── specs/                 auth · catalog · checkout · admin  (+ helpers.js)
└── performance/        smoke.js · load.js · stress.js
security/
├── owasp-checks.mjs    13 verificaciones OWASP con reporte Markdown
└── zap/                openapi.yaml · README (comandos baseline y API scan)
```

**Patrones aplicados:**

- **AAA (Arrange-Act-Assert)** y datos parametrizados con `test.each`, para aplicar PE y VL sin duplicar código. Por ejemplo, las 5 particiones de `calcPrices` o los ids inválidos de `checkObjectId`.
- **Aislamiento:** `beforeEach(db.seed)` deja la BD en un estado conocido en cada prueba de integración. En E2E, `globalSetup` resiembra y se ejecuta con `workers: 1`.
- **Refactor de testabilidad:** la app Express se separó en `app.js`, sin `listen()` ni conexión, para inyectarla en Supertest. Es el único cambio estructural al código del SUT.
- **Defectos como pruebas:** `test.failing('[DEF-xx] …')` (Jest) y `test.fail()` (Playwright) documentan el comportamiento esperado de un defecto abierto. La suite queda en verde y avisa cuando el defecto se corrige, momento en que pasa a ser una prueba de regresión.

## 9.3 Escenarios cubiertos

| Escenario | Unit | API | E2E |
|---|---|---|---|
| Login válido e inválido (PE), token y cookie seguros | ✓ | ✓ | ✓ |
| Registro: duplicados, longitud de contraseña (VL), formato de email (PE) | | ✓ | ✓ |
| Perfil: consultar y actualizar, token ausente o manipulado | | ✓ | |
| Catálogo: paginación (VL), búsqueda (PE), top 3, detalle e ids inválidos | ✓ | ✓ | ✓ |
| Reseñas: sin sesión, rating 0/1/5/6 (VL), duplicada | | ✓ | |
| Pedido: cálculo de envío e IVA (TD + VL), precio manipulado, cantidades 0/negativa/stock/stock+1 (VL) | ✓ | ✓ | ✓ |
| Control de acceso: IDOR, admin vs cliente, rutas protegidas | ✓ | ✓ | ✓ |
| Admin: crear, editar y eliminar producto, entregar pedido, carga de imágenes (PE) | | ✓ | ✓ |
| Seguridad: inyección NoSQL y de regex, hashes expuestos, carga anónima | | ✓ | ✓ |

## 9.4 Resultados de ejecución

| Suite | Comando | Pruebas | Resultado | Tiempo |
|---|---|---|---|---|
| Unitarias e integración | `npm run test:coverage` | 91 | 91 ✓ (70 de comportamiento correcto y 21 que documentan defectos abiertos) | ~9 s |
| E2E | `npx playwright test` | 10 | 10 ✓ (9 pasan y 1 falla como se esperaba: DEF-10) | ~18 s |
| Cobertura del backend | Jest v8 | — | **85.9 % de líneas · 91.5 % de ramas** | — |

Evidencias: `evidencias/jest/junit-backend.xml`, `evidencias/playwright/html-report/index.html`, `evidencias/playwright/junit-e2e.xml` y las capturas por prueba en `evidencias/playwright/capturas/`.

## 9.5 Integración CI/CD

ProShop **no tenía pipeline**. Se implementó uno en **GitHub Actions** (`.github/workflows/ci.yml`) que se ejecuta en cada `push` o `pull_request` a `main`:

```
push / PR ─► [1] backend-tests ──► [2] e2e-y-dast ─────────► artefactos: playwright, zap, owasp-checks
               Jest + cobertura      Mongo service + app
               (artefacto lcov)      Playwright → owasp-checks → ZAP baseline
             [3] dependencias        npm audit --omit=dev (informativo hasta corregir DEF-17)
             [4] sonarqube ◄──(lcov) SonarQube Scan si existen SONAR_TOKEN / SONAR_HOST_URL
```

| Job | Qué valida | Política |
|---|---|---|
| `backend-tests` | 91 pruebas de Jest y cobertura. Publica la tabla de cobertura en el resumen del run | **Bloqueante**: si una prueba falla, el pipeline falla y no corren las E2E |
| `e2e-y-dast` | Levanta Mongo (service), siembra datos, inicia la app y corre Playwright, `owasp-checks` y ZAP baseline | **Bloqueante** para Playwright. ZAP y owasp-checks son informativos (`-I`) y se adjuntan como artefactos |
| `dependencias` | `npm audit` de producción | Informativo mientras DEF-17 siga abierto. El objetivo es bloquear con `--audit-level=high` |
| `sonarqube` | Análisis estático con la cobertura del job 1 | Se activa al configurar los secrets (SonarCloud gratuito para repos públicos, o un servidor propio) |

**Cómo se usa en el flujo del equipo:**

1. Cada integrante trabaja en `main` (o en una rama con su PR) y hace push.
2. GitHub Actions ejecuta el pipeline y deja el estado en el commit (✓ / ✗).
3. Si una prueba de regresión falla, el commit queda marcado y se abre un defecto.
4. Los reportes (HTML de Playwright, ZAP y cobertura) se descargan desde los *Artifacts* del run, y sirven como evidencia del informe.

**Mejoras propuestas para un pipeline de producción:**

- Un *quality gate* de SonarQube que bloquee si la cobertura de código nuevo es menor al 80 % o aparece una vulnerabilidad nueva.
- Escaneo activo de ZAP en un ambiente de staging, solo en ejecuciones nocturnas por su duración.
- `k6 load.js` nocturno contra staging con umbrales del RNF01 y RNF02.
- Dependabot para dependencias, y protección de rama que exija el pipeline en verde para hacer merge.
- Despliegue continuo a un ambiente de staging (Render o Railway) cuando el pipeline pasa en `main`.

## 9.6 Dificultades de automatización encontradas

| Dificultad | Solución |
|---|---|
| El backend usa ES Modules, y Jest los soporta solo de forma experimental | `node --experimental-vm-modules` con `transform: {}`, e importar `jest` desde `@jest/globals` |
| `server.js` se conecta a la BD y abre un puerto al importarse | Refactor mínimo: `app.js` (fábrica) + `server.js` (arranque) |
| Las pruebas y la app cargaban instancias distintas de mongoose | `modulePaths: ['<rootDir>/app/node_modules']` para compartir la misma instancia |
| La cookie JWT es `Secure` fuera de desarrollo y Supertest no la reenvía por http | Helper `loginCookie()` que extrae la cookie y la envía en el header `Cookie` |
| Toasts de react-toastify superpuestos generaban lecturas incorrectas en la ejecución asistida | Esperar a que desaparezca el toast anterior antes de la siguiente acción |
| Selector ambiguo (`/^Order /` coincidía con 3 encabezados) | `getByRole('heading', { level: 1, … })` |
| Las redirecciones de `AdminRoute` y luego `LoginScreen` (sesión activa) llevaban a `/` en vez de `/login` | Se ajustó la aserción al comportamiento correcto: no permanecer en `/admin/*` |
| El puerto 5000 estaba ocupado por AirPlay (macOS) | Backend en :5001 y proxy del frontend actualizado |
| El pago con PayPal requiere credenciales y un servicio externo | Fuera de alcance. El E2E llega hasta la creación del pedido ("Not Paid") |
