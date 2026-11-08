# 1. Contexto del proyecto y requisitos de calidad

## 1.1 Presentación del sistema

**ProShop v2** es una tienda en línea de código abierto, con licencia MIT, construida con el stack MERN (MongoDB, Express, React y Node.js). Su autor es Brad Traversy (Traversy Media) y la usan como proyecto de referencia miles de desarrolladores: el repositorio original tiene más de 700 estrellas y 400 forks.

Ofrece las funciones típicas de un e-commerce:

- Catálogo de productos con búsqueda, paginación y carrusel de los mejor calificados.
- Carrito de compras y checkout en 4 pasos: envío, método de pago, confirmación y pedido.
- Pago con PayPal o tarjeta (sandbox).
- Registro, inicio de sesión y perfil de usuario con historial de pedidos.
- Reseñas y calificación (1 a 5 estrellas) de productos.
- Panel de administración: CRUD de productos con carga de imágenes, gestión de usuarios y marcado de pedidos como entregados.

**Problema que resuelve:** permite que un comercio pequeño venda en línea con un flujo completo, desde el catálogo hasta el pedido y el pago, y que administre inventario, clientes y despachos desde un único panel.

**Por qué lo elegimos:**

1. Es un sistema **real y funcional**, con un dominio de negocio que todos entendemos.
2. Tiene **reglas de negocio verificables**: costo de envío según subtotal, IVA del 15 %, stock y calificaciones de 1 a 5. Son el terreno natural para partición de equivalencia, valores límite y tablas de decisión.
3. Maneja **autenticación, roles, datos personales y pagos**, lo que hace relevante el análisis de seguridad con OWASP Top 10.
4. **No trae ninguna prueba automatizada**. Todo el trabajo de QA de este repositorio es aporte del equipo.
5. Tiene el tamaño adecuado: unas 3.500 líneas de código, abarcables en el tiempo del curso pero con complejidad suficiente.

## 1.2 Arquitectura

**Tipo:** cliente-servidor en tres capas. Es una SPA (Single Page Application) que consume una API REST monolítica, con una base de datos documental.

```
┌──────────────────────────┐    HTTP/JSON     ┌─────────────────────────────┐   Mongoose   ┌──────────────┐
│  Frontend (SPA)          │  (cookie JWT     │  Backend API REST           │  (ODM)       │  MongoDB 7   │
│  React 18 + Redux Toolkit│   HttpOnly)      │  Node.js + Express 4        │ ───────────► │  users       │
│  RTK Query, React-Router │ ───────────────► │  /api/products  /api/users  │              │  products    │
│  React-Bootstrap         │                  │  /api/orders    /api/upload │              │  orders      │
│  :3000 (dev server CRA)  │ ◄─────────────── │  middlewares: protect, admin│              └──────────────┘
└──────────────────────────┘                  │  checkObjectId, errorHandler│
            │                                 │  :5001                      │──► PayPal REST API (sandbox)
            └────── PayPal JS SDK ───────────►└─────────────────────────────┘──► Sistema de archivos (/uploads)
```

**Capas del backend:**

```
routes/      → definición de endpoints y middlewares por ruta
middleware/  → autenticación JWT (protect), autorización (admin), validación de ObjectId, manejo de errores
controllers/ → lógica de cada caso de uso (usuarios, productos, pedidos)
models/      → esquemas Mongoose (User, Product con Review embebido, Order)
utils/       → cálculo de precios (calcPrices), generación de token, integración PayPal
```

## 1.3 Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 18.2, Redux Toolkit 1.9 (RTK Query), React Router 6, React-Bootstrap 2 y Bootstrap 5, react-toastify, Create React App 5 |
| Backend | Node.js (ES Modules), Express 4.18, jsonwebtoken 9, bcryptjs 2.4, cookie-parser, multer (carga de archivos), dotenv |
| Base de datos | MongoDB 7 (contenedor Docker) con el ODM Mongoose 7 |
| Integraciones | PayPal REST API (sandbox) y PayPal JS SDK |
| Infraestructura (QA) | Docker Compose: MongoDB, SonarQube, OWASP ZAP y k6. GitHub Actions como CI |
| Herramientas de QA | Jest 29, Supertest, mongodb-memory-server, Playwright, k6, SonarQube Community, OWASP ZAP, npm audit |

## 1.4 Alcance funcional cubierto por las pruebas

| Módulo | Incluido | Observación |
|---|---|---|
| Autenticación y registro | Sí | Interfaz y API |
| Perfil de usuario | Sí | |
| Catálogo, búsqueda y paginación | Sí | |
| Carrito y checkout (envío, método de pago, pedido) | Sí | |
| Cálculo de precios (envío e IVA) | Sí | Unitario, API y E2E |
| Reseñas | Sí | |
| Administración de productos y carga de imágenes | Sí | |
| Administración de usuarios y pedidos | Parcial | API: listar, eliminar admin, marcar entregado |
| **Pago real con PayPal** | **No** | Depende de credenciales y servicio externo de PayPal. Fuera de alcance (ver plan de pruebas, §2.3) |

## 1.5 Requisitos funcionales

Los requisitos se obtuvieron por ingeniería inversa del código y de la documentación del proyecto, porque el sistema no trae una especificación formal.

| ID | Requisito |
|---|---|
| RF01 | El sistema deberá permitir la autenticación de usuarios con email y contraseña, y mantener la sesión con un token JWT en una cookie HttpOnly. |
| RF02 | El sistema deberá permitir el registro de nuevos clientes con nombre, email válido y único (sin distinguir mayúsculas) y una contraseña de al menos 6 caracteres. |
| RF03 | El sistema deberá permitir al usuario autenticado consultar y actualizar su perfil (nombre, email y contraseña). |
| RF04 | El sistema deberá mostrar el catálogo paginado (8 productos por página), permitir la búsqueda por nombre sin distinguir mayúsculas y mostrar los 3 productos mejor calificados. |
| RF05 | El sistema deberá permitir a un usuario autenticado publicar una única reseña por producto, con una calificación entera entre 1 y 5 y un comentario, y recalcular el promedio. |
| RF06 | El sistema deberá calcular el pedido en el servidor: subtotal con los precios de la BD, envío gratis si el subtotal es mayor a $100 o $10 en otro caso, IVA del 15 % y total. Las cantidades deben estar entre 1 y el stock disponible. |
| RF07 | El sistema deberá permitir que cada cliente consulte únicamente sus propios pedidos. El administrador puede consultar todos y marcarlos como entregados. |
| RF08 | El sistema deberá permitir al administrador crear, editar (precio ≥ 0 y stock ≥ 0) y eliminar productos, y cargar imágenes (solo jpg, jpeg, png y webp). |
| RF09 | El sistema deberá impedir que un usuario no administrador acceda a las funciones de administración, tanto en la interfaz como en la API. |

## 1.6 Requisitos no funcionales

| ID | Atributo | Requisito |
|---|---|---|
| RNF01 | Rendimiento | El 95 % de las peticiones a la API deberá responder en menos de 3 segundos con 50 usuarios concurrentes. |
| RNF02 | Fiabilidad | La tasa de errores HTTP bajo carga nominal (50 usuarios) deberá ser menor al 1 %. |
| RNF03 | Fiabilidad | Las entradas inválidas deberán responder con un error 4xx descriptivo, nunca con 500. |
| RNF04 | Seguridad | Las contraseñas deberán almacenarse con hash bcrypt y nunca devolverse en las respuestas. |
| RNF05 | Seguridad | El sistema no deberá presentar vulnerabilidades de severidad alta del OWASP Top 10 2021 (control de acceso, inyección, configuración, componentes vulnerables, autenticación). |
| RNF06 | Usabilidad | La interfaz deberá ser responsive y usable en pantallas móviles de 375 px de ancho, sin scroll horizontal. |
| RNF07 | Usabilidad | Los errores de validación deberán comunicarse al usuario con mensajes visibles. |
| RNF08 | Mantenibilidad | El código deberá obtener calificación A en mantenibilidad en SonarQube y menos de 5 % de líneas duplicadas. |
| RNF09 | Usabilidad / Accesibilidad | La página de inicio deberá obtener un puntaje de accesibilidad mayor o igual a 90 en Lighthouse (WCAG 2.1: textos alternativos, contraste y nombres de enlaces). |

## 1.7 Criterios de aceptación

Se aceptan los criterios en formato **Dado / Cuando / Entonces**. Una funcionalidad se considera aceptada cuando **todos** sus casos de prueba asociados quedan en estado *Aprobado* y no tiene defectos abiertos de severidad Crítica o Alta.

| Req. | Criterio de aceptación |
|---|---|
| RF01 | **Dado** un usuario registrado, **cuando** ingresa email y contraseña correctos, **entonces** queda autenticado y su nombre aparece en la cabecera. Con credenciales incorrectas recibe "Invalid email or password" y no se crea sesión. |
| RF02 | **Dado** un visitante, **cuando** se registra con datos válidos, **entonces** se crea la cuenta y queda autenticado. Se rechaza con un mensaje si el email ya existe (con cualquier capitalización), si el email no tiene formato válido, si la contraseña tiene menos de 6 caracteres o si las contraseñas no coinciden. |
| RF04 | **Dada** una búsqueda, **cuando** el término coincide parcialmente con el nombre, **entonces** se listan esos productos. Un término con caracteres especiales se trata como texto literal, sin errores. |
| RF05 | Solo usuarios autenticados reseñan, una vez por producto. Las calificaciones fuera de 1 a 5 se rechazan con 400. |
| RF06 | **Dado** un carrito, **cuando** el subtotal es ≤ $100, **entonces** el envío es $10. Si es > $100, es $0. El IVA es el 15 % del subtotal redondeado a 2 decimales. Las cantidades ≤ 0 o mayores al stock se rechazan con 400. |
| RF07 | **Dado** un cliente autenticado, **cuando** solicita un pedido de otro cliente, **entonces** recibe 403 o 404 y no ve ningún dato del pedido. |
| RF08 | Se rechaza con 400 un precio o stock negativo, y también un archivo que no sea jpg, jpeg, png o webp. |
| RF09 | Un cliente que intenta acceder a `/admin/*` es redirigido y la API responde 401. |
| RNF01 / RNF02 | La prueba de carga en k6 cumple los umbrales `p(95) < 3000 ms` y `http_req_failed < 1 %`. |
| RNF05 | El análisis con ZAP y SonarQube no reporta hallazgos de riesgo Alto sin mitigar. |

## 1.8 Atributos de calidad analizados (ISO/IEC 25010)

| Atributo | Cómo se evalúa | Evidencia |
|---|---|---|
| **Funcionalidad** (adecuación funcional) | Casos manuales CP-01 a CP-14, pruebas de API y E2E contra RF01–RF09 | `docs/03-casos-de-prueba.md`, reportes de Jest y Playwright |
| **Usabilidad** | Mensajes de error visibles (RNF07), vista móvil de 375 px (RNF06) y accesibilidad con Lighthouse (RNF09) | CP-08, CP-12, CP-14, `evidencias/lighthouse/` |
| **Fiabilidad** | Manejo de entradas inválidas (RNF03) y estabilidad bajo carga (RNF02) | Pruebas `[DEF-09]`, `evidencias/k6/` |
| **Rendimiento** (eficiencia de desempeño) | Tiempos de respuesta y throughput con k6, y Lighthouse para el frontend | `docs/05-rendimiento-y-no-funcionales.md` |
| **Seguridad** | OWASP Top 10: SonarQube (SAST), OWASP ZAP (DAST), npm audit y pruebas manuales de control de acceso | `docs/06-seguridad-owasp.md` |
| **Mantenibilidad** | SonarQube: code smells, duplicación, deuda técnica, cobertura y rating | `docs/07-metricas-de-calidad.md` |
