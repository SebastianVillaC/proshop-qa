# 8. Gestión de defectos

## 8.1 Herramienta

Los defectos se gestionan en **GitHub Issues** del repositorio, con un tablero de **GitHub Projects** (vista Kanban). Se eligió porque está integrado con el código y el pipeline de CI: un commit con `Closes #N` cierra el issue automáticamente y deja trazabilidad entre el defecto, la corrección y la verificación.

- **Plantilla de reporte:** `.github/ISSUE_TEMPLATE/reporte-defecto.yml`, un formulario con todos los campos obligatorios.
- **Etiquetas:** `defecto`, `severidad: Crítico|Alto|Medio|Bajo`, `prioridad: P1..P4`, `seguridad`, `estado: en progreso` y `estado: verificado`.
- **Registro maestro:** `.github/defectos.json`. El script `scripts/crear-issues.mjs` crea las etiquetas y los issues a partir de él, sin duplicar los que ya existen.

## 8.2 Clasificación

**Severidad** (impacto técnico y de negocio del defecto):

| Severidad | Criterio |
|---|---|
| **Crítico** | Compromete datos personales o dinero, permite tomar cuentas o bloquea una funcionalidad principal sin alternativa. |
| **Alto** | Funcionalidad importante con un comportamiento incorrecto o una vulnerabilidad explotable con un impacto acotado. Existe un workaround. |
| **Medio** | Una regla de negocio o validación secundaria falla, o se viola un requisito no funcional sin pérdida de datos. |
| **Bajo** | Cosmético, de presentación o de endurecimiento (hardening), con impacto mínimo. |

**Prioridad** (urgencia de la corrección):

| Prioridad | Criterio |
|---|---|
| **P1** | Corregir antes de cualquier despliegue (bloqueante). |
| **P2** | Corregir en la iteración actual. |
| **P3** | Planificar para la siguiente iteración. |
| **P4** | Backlog, cuando haya capacidad. |

La severidad la asigna QA. La prioridad se acuerda con el equipo según el riesgo y el esfuerzo: un defecto Medio puede ser P2 si su corrección es trivial.

## 8.3 Ciclo de vida de un defecto

```
 ┌───────┐   triage    ┌──────────┐  inicia   ┌─────────────┐  commit "Closes #N"  ┌───────────┐
 │ Nuevo │ ──────────► │ Asignado │ ────────► │ En progreso │ ───────────────────► │ Corregido │
 └───────┘             └──────────┘           └─────────────┘                      └─────┬─────┘
     │                                               ▲                                   │ QA reejecuta
     │ no reproducible / duplicado                   │ falla la verificación (Reabierto) │ caso + regresión
     ▼                                               └───────────────────────────────────┤
 ┌───────────┐                                                                           ▼
 │ Rechazado │                                                ┌─────────┐  ok   ┌────────────┐
 └───────────┘                                                │ Cerrado │ ◄──── │ Verificado │
                                                              └─────────┘       └────────────┘
```

| Estado | Representación en GitHub | Quién |
|---|---|---|
| Nuevo | Issue abierto con la etiqueta `defecto` (creado desde la plantilla) | Quien detecta |
| Asignado | *Assignees* + severidad y prioridad + columna "Por hacer" | Responsable de QA |
| En progreso | Etiqueta `estado: en progreso` + columna "En progreso" | Desarrollador |
| Corregido | Commit o PR con `Closes #N` (GitHub cierra el issue y enlaza el commit) | Desarrollador |
| Verificado | Comentario de QA con la evidencia de la reejecución + etiqueta `estado: verificado` | QA (distinto de quien corrigió) |
| Cerrado | Issue cerrado como *completed* | QA |
| Reabierto | *Reopen* si la verificación falla | QA |
| Rechazado | Cerrado como *not planned* con la justificación | Responsable de QA |

**Regla del equipo:** todo defecto corregido debe tener una **prueba automatizada de regresión**. Si el defecto fue documentado con `test.failing('[DEF-xx] …')`, la corrección cambia esa prueba a `test(...)` en el mismo commit.

## 8.4 Registro de defectos

**Total: 18 defectos**, todos reproducidos y con evidencia.

| Severidad | Cantidad | | Prioridad | Cantidad |
|---|---|---|---|---|
| Crítico | 3 | | P1 | 6 |
| Alto | 5 | | P2 | 6 |
| Medio | 7 | | P3 | 4 |
| Bajo | 3 | | P4 | 2 |

| ID | Título | Módulo | Severidad | Prioridad | Estado | OWASP | Detectado por |
|---|---|---|---|---|---|---|---|
| DEF-01 | Se aceptan pedidos con cantidad 0 o negativa y se generan totales negativos | Pedidos (API) | Crítico | P1 | Abierto | A04 | Exploratoria EXP-1 / prueba de integración |
| DEF-02 | IDOR: un cliente puede consultar los pedidos de otros clientes | Pedidos (API) | Crítico | P1 | Cerrado | A01 | Exploratoria EXP-2 / caso manual CP-13 |
| DEF-03 | La carga de imágenes (/api/upload) no requiere autenticación | Productos / carga de archivos | Alto | P1 | Abierto | A01 | Exploratoria EXP-2 / prueba de integración |
| DEF-04 | Se aceptan pedidos con cantidades superiores al stock y el stock no se descuenta | Pedidos (API) | Alto | P2 | Abierto | A04 | Exploratoria EXP-1 / prueba de integración (VL) |
| DEF-05 | La API acepta calificaciones de reseña fuera del rango 1-5 | Reseñas (API) | Medio | P3 | Abierto | A04 | Prueba de integración (VL) |
| DEF-06 | El administrador puede guardar productos con precio o stock negativos | Administración de productos | Medio | P2 | Abierto | - | Caso manual CP-10 (VL) |
| DEF-07 | El registro no valida el formato del email ni la longitud mínima de la contraseña | Registro de usuarios | Medio | P2 | Abierto | A07 | Caso manual CP-03 (VL) / prueba de integración (PE) |
| DEF-08 | Se pueden crear cuentas duplicadas cambiando mayúsculas en el email | Registro de usuarios | Medio | P3 | Abierto | - | Caso manual CP-04 (PE) |
| DEF-09 | Las entradas inválidas producen HTTP 500 con stack trace en lugar de 4xx | Transversal (API) | Medio | P2 | Abierto | A05 | Exploratoria EXP-3 / OWASP ZAP / pruebas de integración |
| DEF-10 | La búsqueda interpreta el texto como expresión regular (inyección de regex y ReDoS) | Catálogo / búsqueda | Alto | P1 | Abierto | A03 | Caso manual CP-05 / OWASP ZAP (40018) / E2E-07 |
| DEF-11 | No hay protección contra fuerza bruta en el inicio de sesión | Autenticación | Alto | P1 | Abierto | A07 | Exploratoria EXP-4 / owasp-checks SEC-06 |
| DEF-12 | Faltan cabeceras de seguridad HTTP y se expone X-Powered-By | Configuración del servidor | Bajo | P3 | Abierto | A05 | OWASP ZAP baseline / SonarQube S5689 |
| DEF-13 | El token JWT sigue siendo válido después de cerrar sesión | Autenticación | Bajo | P4 | Abierto | A07 | Exploratoria EXP-4 / SEC-08 |
| DEF-14 | Los montos del pedido se muestran sin formato de 2 decimales | Interfaz / detalle de pedido | Bajo | P4 | Abierto | - | Caso manual CP-13 (observación) |
| DEF-15 | Inyección NoSQL en el login permite autenticarse como el administrador sin conocer su email | Autenticación | Crítico | P1 | Abierto | A03 | Exploratoria EXP-4 / SEC-05 |
| DEF-16 | El listado de usuarios expone el hash de las contraseñas | Administración de usuarios | Medio | P2 | Abierto | A02 | SEC-13 / prueba de integración |
| DEF-17 | Dependencias con vulnerabilidades conocidas (3 críticas en el backend) | Dependencias | Alto | P2 | Abierto | A06 | npm audit |
| DEF-18 | La página de inicio no cumple accesibilidad: imágenes sin alt, enlaces sin nombre y bajo contraste | Interfaz / accesibilidad | Medio | P3 | Abierto | - | Lighthouse |

## 8.5 Detalle de cada defecto

### DEF-01: Se aceptan pedidos con cantidad 0 o negativa y se generan totales negativos
| Campo | Valor |
|---|---|
| Descripción | POST /api/orders no valida la cantidad (qty) de cada ítem. Con qty=-5 del producto Airpods (89.99) se crea el pedido con itemsPrice=-449.95, taxPrice=-67.49 y totalPrice=-507.44. |
| Severidad / Prioridad | Crítico / P1 |
| Estado | Abierto |
| Requisito / OWASP | RF06 / A04 |
| Pasos | 1. Iniciar sesión como john@email.com. 2. POST /api/orders con orderItems=[{_id:<Airpods>, qty:-5}]. 3. Revisar la respuesta. |
| Esperado | HTTP 400: la cantidad debe ser un entero entre 1 y el stock disponible. |
| Obtenido | HTTP 201: se crea el pedido con un total negativo (-507.44). |
| Evidencia | `evidencias/seguridad/owasp-checks.md (SEC-03); tests/integration/orders.api.test.js [DEF-01]` |

### DEF-02: IDOR: un cliente puede consultar los pedidos de otros clientes
| Campo | Valor |
|---|---|
| Descripción | GET /api/orders/:id solo exige estar autenticado; no verifica que el pedido pertenezca al usuario. Cualquier cliente obtiene el nombre, el email, la dirección y los productos de un pedido ajeno. |
| Severidad / Prioridad | Crítico / P1 |
| Estado | Cerrado |
| Requisito / OWASP | RF07 / A01 |
| Pasos | 1. John crea un pedido. 2. Jane inicia sesión. 3. Jane abre /order/<id del pedido de John>. |
| Esperado | HTTP 404 / acceso denegado sin datos del pedido. |
| Obtenido | HTTP 200: Jane ve el nombre, el email y la dirección privada de John. |
| Evidencia | `evidencias/manuales/CP-13-pedido-ajeno-visible.png; evidencias/seguridad/owasp-checks.md (SEC-01)` |
| Corrección | app/backend/controllers/orderController.js: se valida dueño o admin y se responde 404. |
| Verificación | Prueba de regresión [DEF-02] en verde; evidencias/manuales/CP-13-post-fix-pedido-ajeno-bloqueado.png; evidencias/seguridad/owasp-checks-post-fix-DEF-02.md (SEC-01 OK) |

### DEF-03: La carga de imágenes (/api/upload) no requiere autenticación
| Campo | Valor |
|---|---|
| Descripción | La ruta POST /api/upload no usa los middlewares protect ni admin: un usuario anónimo puede escribir archivos en el servidor. Tampoco hay límite de tamaño (SonarQube S5693). |
| Severidad / Prioridad | Alto / P1 |
| Estado | Abierto |
| Requisito / OWASP | RF08, RF09 / A01 |
| Pasos | 1. Sin sesión, POST /api/upload multipart con image=foto.jpg (image/jpeg). |
| Esperado | HTTP 401 Not authorized. |
| Obtenido | HTTP 200 'Image uploaded successfully' y el archivo queda en /uploads. |
| Evidencia | `evidencias/seguridad/owasp-checks.md (SEC-02); tests/integration/upload.api.test.js [DEF-03]` |

### DEF-04: Se aceptan pedidos con cantidades superiores al stock y el stock no se descuenta
| Campo | Valor |
|---|---|
| Descripción | POST /api/orders acepta qty=stock+1 (y hasta 9999) y nunca actualiza countInStock, lo que permite sobreventa. |
| Severidad / Prioridad | Alto / P2 |
| Estado | Abierto |
| Requisito / OWASP | RF06 / A04 |
| Pasos | 1. Iniciar sesión. 2. POST /api/orders con Airpods (stock 10) y qty=11. |
| Esperado | HTTP 400: cantidad mayor al stock disponible. |
| Obtenido | HTTP 201: se crea el pedido. |
| Evidencia | `tests/integration/orders.api.test.js [DEF-04] (VL stock+1)` |

### DEF-05: La API acepta calificaciones de reseña fuera del rango 1-5
| Campo | Valor |
|---|---|
| Descripción | POST /api/products/:id/reviews acepta rating 0, 6 o 7 y los incluye en el promedio del producto. La interfaz limita el valor con un select, pero la API no. |
| Severidad / Prioridad | Medio / P3 |
| Estado | Abierto |
| Requisito / OWASP | RF05 / A04 |
| Pasos | 1. Iniciar sesión. 2. POST /api/products/<id>/reviews {rating: 6, comment: 'x'}. |
| Esperado | HTTP 400: el rating debe estar entre 1 y 5. |
| Obtenido | HTTP 201 'Review added'. |
| Evidencia | `tests/integration/products.api.test.js [DEF-05] (VL 0 y 6)` |

### DEF-06: El administrador puede guardar productos con precio o stock negativos
| Campo | Valor |
|---|---|
| Descripción | Ni el formulario ni PUT /api/products/:id validan que price >= 0 y countInStock >= 0. |
| Severidad / Prioridad | Medio / P2 |
| Estado | Abierto |
| Requisito / OWASP | RF08 / - |
| Pasos | 1. Admin > Products > Create Product > Edit. 2. Precio -10 y stock -3. 3. Update. |
| Esperado | Mensaje de validación; el producto no se guarda. |
| Obtenido | 'Product updated' y el listado muestra $-10. |
| Evidencia | `evidencias/manuales/CP-10-admin-precio-negativo-guardado.png; tests/integration/products.api.test.js [DEF-06]` |

### DEF-07: El registro no valida el formato del email ni la longitud mínima de la contraseña
| Campo | Valor |
|---|---|
| Descripción | Se crean cuentas con contraseñas de 1 a 5 caracteres y emails sin formato válido (por ejemplo 'noesunemail') a través de la API. |
| Severidad / Prioridad | Medio / P2 |
| Estado | Abierto |
| Requisito / OWASP | RF02 / A07 |
| Pasos | 1. /register con la contraseña 'abcde' (5 caracteres). 2. Por API: POST /api/users con email 'noesunemail' y password '1'. |
| Esperado | Rechazo con un mensaje (mínimo 6 caracteres y email válido). |
| Obtenido | Las cuentas se crean (HTTP 201). |
| Evidencia | `evidencias/manuales/CP-03-registro-password-5-caracteres.png; owasp-checks.md (SEC-07)` |

### DEF-08: Se pueden crear cuentas duplicadas cambiando mayúsculas en el email
| Campo | Valor |
|---|---|
| Descripción | La unicidad del email distingue mayúsculas: 'JOHN@EMAIL.COM' se registra aunque exista 'john@email.com'. |
| Severidad / Prioridad | Medio / P3 |
| Estado | Abierto |
| Requisito / OWASP | RF02 / - |
| Pasos | 1. /register con 'JOHN@EMAIL.COM'. |
| Esperado | 'User already exists'. |
| Obtenido | Se crea una segunda cuenta y se inicia sesión. |
| Evidencia | `evidencias/manuales/CP-04-registro-email-mayusculas.png; tests/integration/users.api.test.js [DEF-08]` |

### DEF-09: Las entradas inválidas producen HTTP 500 con stack trace en lugar de 4xx
| Campo | Valor |
|---|---|
| Descripción | Responden 500 (con stack y rutas del servidor en desarrollo): GET /api/orders/abc (CastError), pageNumber=-1 (skip negativo), registro con nombre vacío (ValidationError), POST /api/orders sin orderItems (TypeError) y cambio de email a uno existente (E11000). |
| Severidad / Prioridad | Medio / P2 |
| Estado | Abierto |
| Requisito / OWASP | RNF03 / A05 |
| Pasos | 1. GET /api/orders/abc con sesión. |
| Esperado | HTTP 404/400 con un mensaje descriptivo, sin stack. |
| Obtenido | HTTP 500 'Cast to ObjectId failed…' y stack trace. |
| Evidencia | `evidencias/zap/api-scan.html (90022, 100000); owasp-checks.md (SEC-09); 6 pruebas [DEF-09]` |

### DEF-10: La búsqueda interpreta el texto como expresión regular (inyección de regex y ReDoS)
| Campo | Valor |
|---|---|
| Descripción | keyword se pasa sin escapar a $regex. '(' o '*' muestran al usuario 'Regular expression is invalid…' (500); '.*' devuelve todo el catálogo; patrones catastróficos permiten ReDoS. |
| Severidad / Prioridad | Alto / P1 |
| Estado | Abierto |
| Requisito / OWASP | RF04 / A03 |
| Pasos | 1. Buscar '(' en la caja de búsqueda. |
| Esperado | 0 resultados sin error; el término se trata como texto literal. |
| Obtenido | Alerta roja 'Regular expression is invalid: missing closing parenthesis'. |
| Evidencia | `evidencias/manuales/CP-05-busqueda-parentesis.png; evidencias/playwright (E2E-07); evidencias/zap/api-scan.html` |

### DEF-11: No hay protección contra fuerza bruta en el inicio de sesión
| Campo | Valor |
|---|---|
| Descripción | Se permiten intentos ilimitados de login (30 fallidos seguidos sin 429 ni bloqueo). |
| Severidad / Prioridad | Alto / P1 |
| Estado | Abierto |
| Requisito / OWASP | RNF05 / A07 |
| Pasos | 1. 30 POST /api/users/auth con contraseñas incorrectas. 2. Intento 31 con la contraseña correcta. |
| Esperado | HTTP 429 o bloqueo temporal después de N intentos. |
| Obtenido | Siempre 401 y luego 200 con la contraseña correcta. |
| Evidencia | `evidencias/seguridad/owasp-checks.md (SEC-06)` |

### DEF-12: Faltan cabeceras de seguridad HTTP y se expone X-Powered-By
| Campo | Valor |
|---|---|
| Descripción | Sin Content-Security-Policy, X-Frame-Options, X-Content-Type-Options ni Permissions-Policy; la cabecera X-Powered-By: Express revela la tecnología. |
| Severidad / Prioridad | Bajo / P3 |
| Estado | Abierto |
| Requisito / OWASP | RNF05 / A05 |
| Pasos | 1. curl -I http://localhost:5001/api/products. |
| Esperado | Cabeceras de seguridad presentes (helmet). |
| Obtenido | Ausentes; X-Powered-By: Express. |
| Evidencia | `evidencias/zap/baseline-frontend.html; evidencias/sonarqube/02-issues.png` |

### DEF-13: El token JWT sigue siendo válido después de cerrar sesión
| Campo | Valor |
|---|---|
| Descripción | Logout solo borra la cookie del navegador; el token (válido 30 días) sigue autorizando peticiones si fue copiado. |
| Severidad / Prioridad | Bajo / P4 |
| Estado | Abierto |
| Requisito / OWASP | RF01 / A07 |
| Pasos | 1. Login y copiar la cookie jwt. 2. POST /logout. 3. GET /api/users/profile con la cookie copiada. |
| Esperado | HTTP 401. |
| Obtenido | HTTP 200. |
| Evidencia | `evidencias/seguridad/owasp-checks.md (SEC-08)` |

### DEF-14: Los montos del pedido se muestran sin formato de 2 decimales
| Campo | Valor |
|---|---|
| Descripción | En /order/:id el resumen muestra '$10' y '$13.5', mientras que en /placeorder muestra '$10.00' y '$13.50' (inconsistencia de presentación). |
| Severidad / Prioridad | Bajo / P4 |
| Estado | Abierto |
| Requisito / OWASP | RNF07 / - |
| Pasos | 1. Crear un pedido de Airpods x1. 2. Ver el resumen en /order/:id. |
| Esperado | Shipping $10.00 y Tax $13.50. |
| Obtenido | Shipping $10 y Tax $13.5. |
| Evidencia | `evidencias/manuales/CP-13-post-fix-dueno-ve-su-pedido.png` |

### DEF-15: Inyección NoSQL en el login permite autenticarse como el administrador sin conocer su email
| Campo | Valor |
|---|---|
| Descripción | authUser pasa req.body.email directo a User.findOne(). Con {"$ne":null} se obtiene el primer usuario (el admin) y basta adivinar su contraseña; con $regex se enumeran cuentas. |
| Severidad / Prioridad | Crítico / P1 |
| Estado | Abierto |
| Requisito / OWASP | RF01, RNF05 / A03 |
| Pasos | 1. POST /api/users/auth {"email":{"$ne":null},"password":"123456"}. |
| Esperado | HTTP 400/401. |
| Obtenido | HTTP 200 con la sesión de 'Admin User' (isAdmin: true). |
| Evidencia | `evidencias/seguridad/owasp-checks.md (SEC-05); tests/integration/users.api.test.js [DEF-15]` |

### DEF-16: El listado de usuarios expone el hash de las contraseñas
| Campo | Valor |
|---|---|
| Descripción | GET /api/users (admin) devuelve el campo password (bcrypt) de todos los usuarios. |
| Severidad / Prioridad | Medio / P2 |
| Estado | Abierto |
| Requisito / OWASP | RNF04 / A02 |
| Pasos | 1. Login como admin. 2. GET /api/users. |
| Esperado | Respuesta sin el campo password. |
| Obtenido | "password":"$2a$10$..." en cada usuario. |
| Evidencia | `evidencias/seguridad/owasp-checks.md (SEC-13); tests/integration/users.api.test.js [DEF-16]` |

### DEF-17: Dependencias con vulnerabilidades conocidas (3 críticas en el backend)
| Campo | Valor |
|---|---|
| Descripción | Backend: 25 vulnerabilidades (3 críticas: mongoose 7.0.1, proxy-addr, shell-quote; 16 altas: express, body-parser, path-to-regexp, jws…). Frontend: 82 (6 críticas). |
| Severidad / Prioridad | Alto / P2 |
| Estado | Abierto |
| Requisito / OWASP | RNF05 / A06 |
| Pasos | 1. cd app && npm audit. |
| Esperado | 0 vulnerabilidades críticas o altas en dependencias de producción. |
| Obtenido | 3 críticas y 16 altas en el backend. |
| Evidencia | `evidencias/npm-audit/backend-audit.txt, frontend-audit.txt` |

### DEF-18: La página de inicio no cumple accesibilidad: imágenes sin alt, enlaces sin nombre y bajo contraste
| Campo | Valor |
|---|---|
| Descripción | Puntaje de accesibilidad de 84 (escritorio) y 83 (móvil), menor al 90 requerido. Auditorías fallidas: image-alt, link-name, color-contrast y heading-order (Product.jsx no define alt en Card.Img). |
| Severidad / Prioridad | Medio / P3 |
| Estado | Abierto |
| Requisito / OWASP | RNF09 / - |
| Pasos | 1. Lighthouse sobre / (build de producción). |
| Esperado | Accesibilidad >= 90. |
| Obtenido | 84 / 83. |
| Evidencia | `evidencias/lighthouse/home-desktop.report.html, home-mobile.report.html` |

## 8.6 Ciclo de vida del defecto representativo: DEF-02 (IDOR en pedidos)

Se eligió DEF-02 porque es **crítico**, afecta datos personales (OWASP A01) y su corrección es acotada, así que permite recorrer el ciclo completo.

| # | Estado | Acción | Evidencia |
|---|---|---|---|
| 1 | **Nuevo** | Durante la sesión exploratoria EXP-2 y el caso CP-13, Jane abre el pedido de John y ve sus datos. Se reporta el issue con la plantilla. | `evidencias/manuales/CP-13-pedido-ajeno-visible.png` · Issue `[DEF-02]` |
| 2 | **Asignado** | Triage: severidad Crítico, prioridad P1. Se asigna al integrante 3. | Etiquetas y assignee en el issue |
| 3 | **En progreso** | Se agrega la etiqueta `estado: en progreso`. Se escribe primero la prueba que reproduce el defecto: `test.failing('[DEF-02] …')` en `orders.api.test.js` (TDD de defectos). | Ronda 3 del historial de commits |
| 4 | **Corregido** | `getOrderById` valida `order.user._id.equals(req.user._id) \|\| req.user.isAdmin` y, si no, responde 404. La prueba pasa a `test()` como regresión. Commit `fix(orders): …` con `Closes #N`, y GitHub cierra el issue. | Commit de corrección en el historial · `app/backend/controllers/orderController.js` |
| 5 | **Verificado** | QA reejecuta: (a) la suite Jest, donde la prueba `[DEF-02]` pasa y el dueño y el admin siguen accediendo; (b) el caso CP-13, donde Jane ahora ve "Order not found"; (c) `owasp-checks.mjs`, donde SEC-01 pasa a OK; (d) la suite E2E, que sigue 10/10. | `CP-13-post-fix-pedido-ajeno-bloqueado.png` · `CP-13-post-fix-dueno-ve-su-pedido.png` · `owasp-checks-post-fix-DEF-02.md` |
| 6 | **Cerrado** | Comentario de verificación con los enlaces a la evidencia y la etiqueta `estado: verificado`. El issue queda cerrado como *completed*. | Línea de tiempo del issue en GitHub (captura en el informe) |

**Antes de la corrección** (`GET /api/orders/<pedido de John>` con la sesión de Jane):
```
HTTP 200 {"user":{"name":"John Doe","email":"john@email.com"},"shippingAddress":{"address":"Carrera 65 # 98-12 ..."}, ...}
```
**Después de la corrección:**
```
HTTP 404 {"message":"Order not found"}
```

## 8.7 Análisis

- **8 de los 18 defectos (44 %) son Críticos o Altos**, y **6 tienen prioridad P1**. ProShop **no debería desplegarse en producción** sin corregir al menos DEF-01, DEF-02 (ya corregido), DEF-03, DEF-10, DEF-11 y DEF-15.
- **Concentración por módulo:** autenticación y registro (DEF-07, 08, 11, 13, 15) y pedidos (DEF-01, 02, 04) suman 8 defectos. Son justamente los módulos de mayor riesgo, lo que valida la estrategia basada en riesgo del plan.
- **Causa raíz común:** **falta de validación de entradas en el servidor** (DEF-01, 04, 05, 06, 07, 09, 10, 15). El frontend valida algunos campos (select de rating y cantidad, `type=email`, `required`), pero la API confía en el cliente. Una única capa de validación (por ejemplo `zod` o `express-validator`) corregiría 8 defectos.
- **Técnicas más efectivas:** las pruebas exploratorias y los casos diseñados con **PE y VL** (manuales y de API) encontraron **15 de 18** defectos. Las herramientas automáticas detectaron 5: 3 de forma exclusiva (DEF-12 con ZAP y SonarQube, DEF-17 con npm audit, DEF-18 con Lighthouse) y 2 que también encontró una prueba manual (DEF-09 y DEF-10 con ZAP). Las herramientas aportan sobre todo en configuración, dependencias y accesibilidad. Los defectos de lógica y de control de acceso requirieron diseño de pruebas.
