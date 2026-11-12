# 6. Pruebas de seguridad basadas en OWASP Top 10 (2021)

## 6.1 Metodología

Se combinaron cuatro enfoques complementarios, porque ninguna herramienta por sí sola cubre todo el Top 10:

| Enfoque | Herramienta | Qué detecta | Evidencia |
|---|---|---|---|
| **SAST** (análisis estático) | SonarQube Community 26.x, perfil "Sonar way extended" | Patrones inseguros en el código fuente | `evidencias/sonarqube/` |
| **DAST** (análisis dinámico) | OWASP ZAP (stable): *baseline* pasivo sobre el frontend y *API scan* activo autenticado sobre la API (OpenAPI en `security/zap/openapi.yaml`) | Vulnerabilidades observables en tiempo de ejecución: cabeceras, errores, inyección | `evidencias/zap/` |
| **SCA** (análisis de componentes) | `npm audit` | Dependencias con CVE o GHSA conocidos (A06) | `evidencias/npm-audit/` |
| **Pruebas manuales dirigidas** | `security/owasp-checks.mjs` (13 verificaciones reproducibles), curl y navegador | Control de acceso, lógica de negocio, autenticación: lo que las herramientas no "entienden" | `evidencias/seguridad/owasp-checks.md` |

**Escala de riesgo** (OWASP Risk Rating simplificado): **Riesgo = Probabilidad × Impacto**, cada uno en una escala de 1 (bajo) a 3 (alto).

| Puntaje | Nivel |
|---|---|
| 9 | Crítico |
| 6 | Alto |
| 3–4 | Medio |
| 1–2 | Bajo |

## 6.2 Resumen por categoría OWASP Top 10

| Categoría | ¿Afecta? | Hallazgos | Detectado por |
|---|---|---|---|
| **A01** Broken Access Control | ❌ Sí | VUL-01 IDOR en pedidos. VUL-02 carga de archivos anónima | Pruebas manuales (ni SonarQube ni ZAP lo detectaron) |
| **A02** Cryptographic Failures | ⚠️ Parcial | VUL-11 hashes expuestos al admin. JWT HS256 con secreto configurable (débil en el ejemplo del README) | Manual. Las contraseñas sí usan bcrypt (control OK) |
| **A03** Injection | ❌ Sí | VUL-03 inyección NoSQL en el login. VUL-04 inyección de regex y ReDoS en la búsqueda | ZAP (indicio de "SQL Injection") + manual |
| **A04** Insecure Design | ❌ Sí | VUL-05 cantidades negativas o mayores al stock en pedidos | Manual y exploratorias. Control OK: el precio se toma de la BD (SEC-12) |
| **A05** Security Misconfiguration | ❌ Sí | VUL-06 stack traces en errores 500. VUL-07 cabeceras de seguridad ausentes y X-Powered-By | ZAP, SonarQube (S5689) y manual |
| **A06** Vulnerable and Outdated Components | ❌ Sí | VUL-08: 25 vulnerabilidades en el backend (3 críticas) y 82 en el frontend | npm audit |
| **A07** Identification and Authentication Failures | ❌ Sí | VUL-09 sin protección contra fuerza bruta y política de contraseñas débil. VUL-10 JWT no revocable al cerrar sesión | Manual |
| **A08** Software and Data Integrity Failures | ⚠️ Bajo | Carga de archivos sin límite de tamaño (S5693). Sin verificación de integridad (SRI) en el SDK de PayPal | SonarQube |
| **A09** Security Logging and Monitoring Failures | ❌ Sí | No hay registro de intentos fallidos de login ni de accesos denegados: solo `console.error` | Revisión de código |
| **A10** Server-Side Request Forgery | ✅ No | No hay endpoints que reciban URLs del usuario. Las llamadas a PayPal usan una URL fija del `.env` | Revisión de código |

## 6.3 Detalle de vulnerabilidades

### VUL-01: IDOR, cualquier cliente consulta los pedidos de otros (A01) · **Crítico (P3 × I3 = 9)** · DEF-02
- **Ubicación:** `backend/controllers/orderController.js` → `getOrderById`. La ruta solo exige `protect` (estar autenticado) y no verifica que el pedido pertenezca al usuario.
- **Evidencia:** CP-13 (captura `CP-13-pedido-ajeno-visible.png`), SEC-01 y la prueba de integración `[DEF-02]`. Jane obtiene HTTP 200 con el nombre, el email, la **dirección postal** y los productos del pedido de John.
- **Impacto:** exposición de datos personales (habeas data, Ley 1581 de 2012 en Colombia). Los ids son ObjectId de MongoDB, que se pueden predecir en parte (marca de tiempo + contador), así que la enumeración es viable.
- **Mitigación:** comparar `order.user._id` con `req.user._id` y permitir el acceso solo al dueño o a un admin. Si no aplica, responder **404** para no revelar que el pedido existe. Hacer lo mismo en `PUT /:id/pay`. **Corrección planificada como P1** (ver `docs/08`).

### VUL-02: carga de archivos sin autenticación (A01) · **Alto (P3 × I2 = 6)** · DEF-03
- **Ubicación:** `backend/routes/uploadRoutes.js`. `router.post('/')` no tiene los middlewares `protect` ni `admin`.
- **Evidencia:** SEC-02 (HTTP 200 sin cookie) y la prueba `[DEF-03]`.
- **Impacto:** cualquier persona puede llenar el disco del servidor (DoS) o alojar contenido. El filtro por extensión y mimetype se basa en datos que controla el cliente.
- **Mitigación:** `router.post('/', protect, admin, …)`, `limits: { fileSize: 2 * 1024 * 1024 }` en multer, validar los *magic bytes* del archivo y guardar en un almacenamiento externo (S3 o Cloudinary).

### VUL-03: inyección de operadores NoSQL en el inicio de sesión (A03) · **Crítico (P3 × I3 = 9)** · DEF-15
- **Ubicación:** `userController.authUser`. `User.findOne({ email })` recibe el objeto del body sin validarlo.
- **Evidencia:** SEC-05 y la prueba `[DEF-15]`. `{"email":{"$ne":null},"password":"123456"}` devuelve **HTTP 200 con la sesión del administrador** (el primer documento de la colección), sin conocer su email. Con `{"$regex":"^jane"}` se autentica como Jane, lo que permite **enumerar cuentas** carácter por carácter.
- **Impacto:** el atacante solo necesita adivinar una contraseña. Combinado con VUL-09 (sin límite de intentos, contraseñas débiles), lleva a la toma de cuentas incluida la del administrador.
- **Mitigación:** validar los tipos con `express-validator`, `zod` o `joi` (`email` debe ser un string con formato de email), activar `mongoose.set('sanitizeFilter', true)` y usar `express-mongo-sanitize`.

### VUL-04: inyección de expresiones regulares y ReDoS en la búsqueda (A03) · **Alto (P3 × I2 = 6)** · DEF-10
- **Ubicación:** `productController.getProducts`. `$regex: req.query.keyword` sin escapar.
- **Evidencia:** CP-05, SEC-04, E2E-07 y ZAP regla 40018. `keyword=(` produce un error 500 con el mensaje del motor de regex. `keyword=.*` devuelve todo el catálogo.
- **Análisis de la alerta de ZAP:** ZAP la reportó como **"SQL Injection" (riesgo alto, confianza baja)** porque `'(` produjo un error 500. Como **falso positivo es correcto**: no hay SQL, el backend usa MongoDB. Pero la **causa raíz es real**: la entrada del usuario se interpreta como código (regex), y un patrón catastrófico como `(a+)+$` sobre nombres largos puede bloquear el motor de búsqueda (ReDoS).
- **Mitigación:** escapar la entrada (`keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`), limitar su longitud (por ejemplo 50 caracteres) o usar un índice `$text` de MongoDB.

### VUL-05: manipulación de la lógica de negocio en pedidos (A04) · **Crítico (P3 × I3 = 9)** · DEF-01, DEF-04
- **Ubicación:** `orderController.addOrderItems`. Usa el precio de la BD (correcto), pero **no valida `qty`** y **no descuenta el stock**.
- **Evidencia:** SEC-03. Con `qty=-5` se crea un pedido con `totalPrice = -507.44`. Con `qty=9999` se aceptan pedidos que superan el stock (10).
- **Impacto:** fraude (pedidos con total negativo o cero que, con un flujo de pago, podrían usarse para obtener saldo o reembolsos), sobreventa de inventario e integridad contable.
- **Mitigación:** validar `Number.isInteger(qty) && qty >= 1 && qty <= product.countInStock` y descontar el stock de forma atómica (`$inc` con una condición `countInStock >= qty`) dentro de una transacción.

### VUL-06: divulgación de información en los errores (A05) · **Medio (P2 × I2 = 4)** · DEF-09
- **Ubicación:** `errorMiddleware.errorHandler`. Devuelve `err.stack` cuando `NODE_ENV !== 'production'`, y el `.env` de ejemplo usa `development`.
- **Evidencia:** SEC-09 y ZAP 90022 "Application Error Disclosure". `GET /api/orders/abc` devuelve un 500 con el stack, las **rutas absolutas del servidor** (`/Users/.../node_modules/mongoose/...`) y las versiones de las librerías.
- **Mitigación:** no exponer el stack fuera de un entorno de desarrollo local explícito, devolver 400 o 404 ante errores de validación (`CastError` y `ValidationError` → 400) y forzar `NODE_ENV=production` en el despliegue.

### VUL-07: cabeceras de seguridad ausentes (A05) · **Bajo (P2 × I1 = 2)** · DEF-12
- **Evidencia:** ZAP baseline. Medio: *CSP Header Not Set* y *Missing Anti-clickjacking Header*. Bajo: *X-Content-Type-Options*, *Permissions-Policy*, *Cross-Origin-\** y *X-Powered-By: Express*. SonarQube S5689 confirma la divulgación de la versión del framework (`app.js:14`).
- **Impacto:** mayor superficie para clickjacking, MIME sniffing y XSS. El fingerprinting facilita buscar CVE de Express.
- **Mitigación:** `app.use(helmet())` (agrega CSP, X-Frame-Options, nosniff y HSTS, y elimina X-Powered-By).

### VUL-08: componentes con vulnerabilidades conocidas (A06) · **Alto (P2 × I3 = 6)** · DEF-17
- **Evidencia:** `npm audit` del backend: **25 vulnerabilidades (3 críticas, 16 altas, 2 moderadas, 4 bajas)**. Del frontend: 82 (6 críticas), en su mayoría de la cadena de build de `react-scripts`.

| Paquete (versión instalada) | Severidad | Advisory | Relevancia en ProShop |
|---|---|---|---|
| mongoose 7.0.1 (directa) | Crítica | GHSA-9m93-w8w6-76hh Prototype Pollution · GHSA-m7xq-9374-9rvx search injection | Alta: es la capa de acceso a datos |
| express 4.18.2 (directa) | Alta | XSS vía `res.redirect()` y Open Redirect | Media: ProShop no usa redirect con datos del usuario |
| body-parser 1.20.1 | Alta | GHSA-qwcr-r2fm-qrc7 DoS con url-encoding | Alta: `express.urlencoded()` está habilitado |
| path-to-regexp 0.1.7 | Alta | GHSA-9wv6-86v2-598j / GHSA-rhx6-c78j-4q9w ReDoS | Media |
| jws (vía jsonwebtoken) | Alta | GHSA-869p-cjfg-cm3x verificación HMAC incorrecta | Alta: es la base de la autenticación |
| proxy-addr | Crítica | GHSA-jqcg-44mw-7w3h IP spoofing | Baja: no se usa `trust proxy` |
| shell-quote (vía concurrently) | Crítica | GHSA-w7jw-789q-3m8p | Ninguna en producción: es dependencia de desarrollo |

- **Mitigación:** `npm audit fix` (todas tienen una corrección disponible), subir mongoose a ≥ 7.8.x / 8.x y express a ≥ 4.22, activar Dependabot y agregar `npm audit --audit-level=high` al pipeline de CI.

### VUL-09: fuerza bruta y política de contraseñas débil (A07) · **Alto (P3 × I2 = 6)** · DEF-11, DEF-07
- **Evidencia:** SEC-06. 30 intentos fallidos seguidos responden siempre 401: no hay HTTP 429, bloqueo ni captcha, y el intento 31 con la contraseña correcta funciona. En SEC-07 y CP-03 se aceptan contraseñas de 1 a 5 caracteres.
- **Mitigación:** `express-rate-limit` en `/api/users/auth` (por ejemplo 5 intentos cada 15 minutos por IP y por cuenta), longitud mínima de 8 caracteres más la verificación contra listas de contraseñas filtradas, y MFA opcional para los administradores.

### VUL-10: el JWT no se invalida al cerrar sesión (A07) · **Bajo (P1 × I2 = 2)** · DEF-13
- **Evidencia:** SEC-08. Después de `POST /logout`, el mismo token sigue autorizando `GET /profile` (HTTP 200) y es válido durante 30 días.
- **Mitigación:** tokens de vida corta (15 minutos) con refresh token rotativo, o una lista de revocación en Redis.

### VUL-11: el listado de usuarios expone los hashes de las contraseñas (A02) · **Medio (P1 × I3 = 3)** · DEF-16
- **Ubicación:** `userController.getUsers`. `User.find({})` no excluye el campo `password` (en cambio `getUserById` sí usa `.select('-password')`).
- **Evidencia:** SEC-13 y la prueba `[DEF-16]`. `GET /api/users` (admin) devuelve `"password":"$2a$10$..."` de todas las cuentas.
- **Impacto:** si la cuenta de un administrador se ve comprometida (por ejemplo vía VUL-03), el atacante obtiene los hashes para cracking offline.
- **Mitigación:** `.select('-password')` en la consulta, o `select: false` en el esquema.

### Controles que funcionan correctamente (verificados)
| Control | Evidencia |
|---|---|
| El precio del pedido se toma de la BD, no del cliente (anti-tampering) | SEC-12, prueba "ignora el precio enviado por el cliente" |
| Un cliente no puede autoasignarse `isAdmin` desde su perfil | SEC-11 |
| Las contraseñas se almacenan con bcrypt (cost 10) y no se devuelven en login, registro ni perfil | Pruebas de `users.api` |
| Cookie de sesión `HttpOnly`, `SameSite=strict` y `Secure` fuera de desarrollo (mitiga XSS y robo de token, y CSRF) | `generateToken.test.js` y ZAP 10010/10011/10054 (PASS) |
| Las rutas de admin exigen el rol en la API (401) y en la interfaz | `middleware.test.js` y E2E-04/E2E-10 |
| Validación de ObjectId en productos (`checkObjectId`) | `products.api.test.js` |

## 6.4 Resultados de SonarQube (seguridad)

| Métrica | Valor | Interpretación |
|---|---|---|
| Vulnerabilidades | **2** | S5689 (divulgación de la versión de Express, menor) y S5693 (carga sin límite de tamaño, mayor) |
| Security Rating | **C** | Determinado por la vulnerabilidad *Major* de `uploadRoutes.js` |
| Security Hotspots | 0 | — |
| Security Review Rating | A | — |

**Interpretación crítica:** SonarQube reportó solo 2 vulnerabilidades, mientras que las pruebas dirigidas confirmaron **11**. **No detectó** el IDOR, la inyección NoSQL, la ausencia de validación de cantidades ni la carga anónima. Hay dos razones:

1. El dashboard lo advierte con el aviso *"Limited security analysis: SonarQube Community Build does not scan for critical injection vulnerabilities (SQL injection, XSS, and more)"* (captura `01-dashboard-overall.png`). El **análisis de flujo de datos (taint analysis)**, que seguiría `req.body.email` hasta `User.findOne()`, solo está en las ediciones comerciales.
2. El análisis estático encuentra *patrones* inseguros en el código, pero no entiende la *intención de negocio* ("solo el dueño puede ver su pedido").

Esto confirma que el SAST es necesario pero no suficiente, y que hay que conocer las limitaciones de la edición de la herramienta que se usa.

## 6.5 Resultados de OWASP ZAP

**Baseline del frontend** (`baseline-frontend.html`): 0 FAIL, 7 WARN y 61 PASS.

| Alerta | Riesgo | Instancias | Análisis |
|---|---|---|---|
| Content Security Policy Header Not Set (10038) | Medio | 5 | **Válida.** Sin CSP, un XSS no tendría mitigación en el navegador |
| Missing Anti-clickjacking Header (10020) | Medio | 3 | **Válida.** La app puede embeberse en iframes |
| X-Content-Type-Options Missing (10021) | Bajo | 5 | Válida |
| Server Leaks X-Powered-By (10037) | Bajo | 5 | Válida (coincide con SonarQube S5689) |
| Permissions Policy / COEP / COOP / CORP (10063, 90004) | Bajo | 5 / 9 | Válidas, de impacto bajo para esta app |
| Storable and Cacheable Content (10049) | Informativo | 5 | Esperado en recursos estáticos |

**API scan activo autenticado** (`api-scan.html`, 51 URL atacadas con la sesión de un cliente):

| Alerta | Riesgo (confianza) | Análisis |
|---|---|---|
| SQL Injection (40018), en `GET /api/products?keyword='(` y `POST /api/orders` | **Alto (baja)** | **Falso positivo en cuanto a SQL. Verdadero en la causa raíz:** inyección de regex (VUL-04) y `CastError` sin manejar (VUL-06) |
| Server Error response code (100000) ×6 | Bajo | **Válida:** confirma DEF-09 (`/api/orders/0` → 500) |
| Application Error Disclosure (90022) ×2 | Bajo | **Válida:** stack traces expuestos (VUL-06) |
| X-Powered-By, X-Content-Type-Options y CORP | Bajo | Válidas (VUL-07) |
| Cookie No HttpOnly / Without Secure / Without SameSite | PASS | Confirma que la cookie de sesión está bien configurada |

ZAP **tampoco** detectó el IDOR (VUL-01), porque no conoce la relación entre el usuario y el pedido. Para eso hace falta configurar contextos multiusuario o hacer pruebas manuales.

## 6.6 Matriz de riesgos

| | **Impacto bajo (1)** | **Impacto medio (2)** | **Impacto alto (3)** |
|---|---|---|---|
| **Probabilidad alta (3)** | — | VUL-02, VUL-04, VUL-09 | **VUL-01, VUL-03, VUL-05** |
| **Probabilidad media (2)** | VUL-07 | VUL-06 | VUL-08 |
| **Probabilidad baja (1)** | — | VUL-10 | VUL-11 |

## 6.7 Plan de mitigación priorizado

| Prioridad | Acción | Mitiga | Esfuerzo |
|---|---|---|---|
| 1 | Verificar la propiedad del recurso en pedidos | VUL-01 | 30 min |
| 2 | Validar tipos y rangos de la entrada con `express-validator` o `zod`, activar `sanitizeFilter` y escapar el regex | VUL-03, VUL-04, VUL-05, DEF-05/06/07 | 1 día |
| 3 | `protect, admin` y `limits.fileSize` en la carga | VUL-02 | 15 min |
| 4 | `express-rate-limit` en el login y una política de contraseñas | VUL-09 | 2 h |
| 5 | `npm audit fix` y actualizar mongoose y express. `npm audit` en CI | VUL-08 | 2 h + pruebas de regresión |
| 6 | `helmet()`, manejo de `CastError`/`ValidationError` → 400 y sin stack en las respuestas | VUL-06, VUL-07 | 1 h |
| 7 | `.select('-password')` en `getUsers` | VUL-11 | 5 min |
| 8 | Tokens de vida corta más refresh, y registro de eventos de seguridad (login fallido, 401/403) | VUL-10, A09 | 1–2 días |

## 6.8 Conclusión

ProShop v2 tiene **3 vulnerabilidades de riesgo crítico** (IDOR, inyección NoSQL y lógica de pedidos) que permiten acceder a datos personales, tomar la cuenta del administrador y crear pedidos fraudulentos. Ninguna la detectaron las herramientas automáticas por sí solas: aparecieron con **pruebas manuales guiadas por el modelo de amenazas OWASP**. Las herramientas sí aportaron cobertura amplia en configuración (cabeceras, errores), dependencias y calidad del código. La estrategia más efectiva fue **combinar SAST, DAST, SCA y pruebas manuales**, y convertir cada hallazgo en una prueba automatizada (`[DEF-xx]`) que evite su regresión.
