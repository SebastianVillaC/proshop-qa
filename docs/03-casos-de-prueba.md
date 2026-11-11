# 3. Diseño y ejecución de casos de prueba

- **Ambiente:** local. Chromium (Playwright), frontend en http://localhost:3000, API en http://localhost:5001, MongoDB 7 en Docker con los datos semilla.
- **Fecha de ejecución:** noviembre de 2026.
- **Evidencias:** cada caso tiene sus capturas en `evidencias/manuales/` y lo observado en cada paso queda en `evidencias/manuales/resultados-observados.json`.
- **Técnicas:** PE (partición de equivalencia), VL (valores límite), TD (tabla de decisión) y EXP (exploratoria).

## 3.1 Resumen de casos manuales

| ID | Nombre | Requisito | Técnica | Estado | Defecto |
|---|---|---|---|---|---|
| CP-01 | Inicio de sesión con credenciales válidas | RF01 | PE (clase válida) | ✅ Aprobado | — |
| CP-02 | Inicio de sesión con credenciales inválidas | RF01 | PE (3 clases inválidas) | ✅ Aprobado | — |
| CP-03 | Longitud mínima de contraseña en el registro | RF02 | VL (5 / 6) | ❌ Fallido | DEF-07 |
| CP-04 | Registro con email ya existente | RF02 | PE | ❌ Fallido | DEF-08 |
| CP-05 | Búsqueda con texto normal y caracteres especiales | RF04 | PE | ❌ Fallido | DEF-10 |
| CP-06 | Cantidades del carrito según el stock | RF06 | VL (0 / 1 / stock) | ✅ Aprobado | — |
| CP-07 | Costo de envío e IVA según el subtotal | RF06 | TD + VL | ✅ Aprobado | — |
| CP-08 | Campos obligatorios del formulario de envío | RF06, RNF07 | PE | ✅ Aprobado | — |
| CP-09 | Publicación de reseñas | RF05 | PE + transición de estados | ✅ Aprobado | — |
| CP-10 | Producto con precio y stock negativos | RF08 | VL | ❌ Fallido | DEF-06 |
| CP-11 | Carga de archivo que no es imagen | RF08 | PE | ✅ Aprobado | — |
| CP-12 | Actualización del perfil | RF03, RNF07 | PE | ✅ Aprobado | — |
| CP-13 | Acceso al pedido de otro cliente | RF07 | TD (dueño × rol) | ❌ Fallido | DEF-02 |
| CP-14 | Usabilidad en pantalla móvil de 375 px | RNF06 | Prueba de usabilidad | ✅ Aprobado | — |

**Total: 14 casos. 9 aprobados (64.3 %) y 5 fallidos (35.7 %).**

## 3.2 Detalle de casos manuales

### CP-01 — Inicio de sesión con credenciales válidas
| Campo | Valor |
|---|---|
| Objetivo | Verificar que un usuario registrado puede autenticarse. |
| Requisito | RF01 |
| Técnica | PE: clase válida (email registrado + contraseña correcta) |
| Precondiciones | BD sembrada. Usuario `john@email.com` existente. Sin sesión iniciada. |
| Datos de entrada | Email `john@email.com`, contraseña `123456` |
| Pasos | 1. Ir a `/login`. 2. Escribir el email. 3. Escribir la contraseña. 4. Clic en **Sign In**. |
| Resultado esperado | Redirige a `/` y la cabecera muestra el nombre "John Doe". |
| Resultado obtenido | Redirige a `http://localhost:3000/` y la cabecera muestra "John Doe". |
| Estado | ✅ **Aprobado** |
| Evidencia | `CP-01-login-valido.png` |

### CP-02 — Inicio de sesión con credenciales inválidas
| Campo | Valor |
|---|---|
| Objetivo | Verificar que las credenciales inválidas se rechazan sin revelar cuál campo falló. |
| Requisito | RF01 |
| Técnica | PE: 3 clases inválidas |
| Precondiciones | BD sembrada, sin sesión. |
| Datos de entrada | a) `john@email.com` / `000000` · b) `nadie@itm.edu.co` / `123456` · c) email y contraseña vacíos |
| Pasos | Para cada partición: 1. Ir a `/login`. 2. Escribir los datos. 3. Clic en **Sign In**. |
| Resultado esperado | Mensaje "Invalid email or password", sigue en `/login` y no se crea sesión. |
| Resultado obtenido | En las 3 particiones aparece el toast "Invalid email or password" y la URL sigue en `/login`. |
| Estado | ✅ **Aprobado** |
| Evidencia | `CP-02-login-pass-incorrecta.png`, `CP-02-login-email-no-registrado.png`, `CP-02-login-campos-vacios.png` |

### CP-03 — Longitud mínima de contraseña en el registro
| Campo | Valor |
|---|---|
| Objetivo | Verificar el límite inferior de la contraseña (mínimo 6 caracteres). |
| Requisito | RF02 |
| Técnica | VL: 5 caracteres (mínimo−1) y 6 caracteres (mínimo) |
| Precondiciones | Sin sesión. El email no está registrado. |
| Datos de entrada | Nombre "QA 5-caracteres", email único y contraseña `abcde` · Nombre "QA 6-caracteres", email único y contraseña `abcdef` |
| Pasos | 1. Ir a `/register`. 2. Llenar el nombre, el email, la contraseña y su confirmación. 3. Clic en **Register**. |
| Resultado esperado | Con 5 caracteres se rechaza con un mensaje. Con 6 caracteres se crea la cuenta. |
| Resultado obtenido | Con 5 caracteres **se crea la cuenta** y se inicia sesión como "QA 5-caracteres". Con 6 caracteres se crea la cuenta. Por API se acepta incluso una contraseña de 1 carácter. |
| Estado | ❌ **Fallido** (DEF-07) |
| Evidencia | `CP-03-registro-password-5-caracteres.png`, `CP-03-registro-password-6-caracteres.png` |

### CP-04 — Registro con email ya existente
| Campo | Valor |
|---|---|
| Objetivo | Verificar que no se pueden crear cuentas duplicadas. |
| Requisito | RF02 |
| Técnica | PE: email idéntico / email con distinta capitalización |
| Precondiciones | Existe `john@email.com`. |
| Datos de entrada | a) `john@email.com` · b) `JOHN@EMAIL.COM`. Contraseña `123456` en ambos. |
| Pasos | 1. Ir a `/register`. 2. Registrar con a). 3. Cambiar el email a b) y registrar. |
| Resultado esperado | Ambos rechazados con "User already exists", porque el email no distingue mayúsculas. |
| Resultado obtenido | a) "User already exists" ✅. b) **Se crea una segunda cuenta** y se inicia sesión como "John Duplicado". |
| Estado | ❌ **Fallido** (DEF-08) |
| Evidencia | `CP-04-registro-email-identico.png`, `CP-04-registro-email-mayusculas.png` |

### CP-05 — Búsqueda con texto normal y caracteres especiales
| Campo | Valor |
|---|---|
| Objetivo | Verificar que la búsqueda trata el término como texto. |
| Requisito | RF04 |
| Técnica | PE: texto alfanumérico / metacaracteres de expresiones regulares |
| Precondiciones | BD sembrada. |
| Datos de entrada | `sony`, `(`, `*` |
| Pasos | 1. Ir a `/`. 2. Escribir el término en "Search Products...". 3. Clic en **Search**. |
| Resultado esperado | `sony` devuelve 1 producto. `(` y `*` devuelven 0 productos sin error. |
| Resultado obtenido | `sony` devuelve 1 producto. `(` muestra el error **"Regular expression is invalid: missing closing parenthesis"**. `*` muestra **"Regular expression is invalid: quantifier does not follow a repeatable item"**. |
| Estado | ❌ **Fallido** (DEF-10) |
| Evidencia | `CP-05-busqueda-texto-normal.png`, `CP-05-busqueda-parentesis.png`, `CP-05-busqueda-asterisco.png` |

### CP-06 — Cantidades del carrito según el stock
| Campo | Valor |
|---|---|
| Objetivo | Verificar que la cantidad seleccionable va de 1 al stock disponible, y que no se puede comprar un producto agotado. |
| Requisito | RF06 |
| Técnica | VL: stock = 0, mínimo = 1, máximo = stock (10) |
| Precondiciones | Airpods con stock 10. Echo Dot con stock 0. |
| Datos de entrada | Productos Airpods y Echo Dot |
| Pasos | 1. Abrir el detalle de Airpods y desplegar "Qty". 2. Abrir el detalle de Echo Dot. |
| Resultado esperado | Airpods ofrece las opciones 1..10. Echo Dot muestra "Out Of Stock", sin selector y con el botón deshabilitado. |
| Resultado obtenido | Airpods ofrece 10 opciones (1..10). Echo Dot muestra "Out Of Stock", sin selector y con **Add To Cart** deshabilitado. |
| Estado | ✅ **Aprobado** |
| Evidencia | `CP-06-cantidades-airpods.png`, `CP-06-sin-stock-echo.png` |

### CP-07 — Costo de envío e IVA según el subtotal
| Campo | Valor |
|---|---|
| Objetivo | Verificar la tabla de decisión del envío y el cálculo del IVA. |
| Requisito | RF06 |
| Técnica | TD (subtotal ≤ 100 / > 100) + VL alrededor de 100 |
| Precondiciones | Sesión iniciada como Jane. Carrito vacío. |
| Datos de entrada | a) Mouse 49.99 × 2 = 99.98 · b) Mouse 49.99 × 3 = 149.97. Dirección: Calle 73 # 76A-354, Medellín, 050034, Colombia |
| Pasos | 1. Agregar el producto con la cantidad indicada. 2. Proceed To Checkout. 3. Llenar el envío y Continue. 4. Método PayPal y Continue. 5. Revisar el resumen en `/placeorder`. |
| Resultado esperado | a) Items 99.98, Shipping 10.00, Tax 15.00, Total 124.98 · b) Items 149.97, Shipping 0.00, Tax 22.50, Total 172.47 |
| Resultado obtenido | a) Items $99.98, Shipping $10.00, Tax $15.00, Total $124.98 · b) Items $149.97, Shipping $0.00, Tax $22.50, Total $172.47 |
| Estado | ✅ **Aprobado** |
| Evidencia | `CP-07-resumen-mouse-x2-99.98.png`, `CP-07-resumen-mouse-x3-149.97.png` |

### CP-08 — Campos obligatorios del formulario de envío
| Campo | Valor |
|---|---|
| Objetivo | Verificar que no se puede avanzar sin la dirección. |
| Requisito | RF06, RNF07 |
| Técnica | PE: campo vacío (clase inválida) |
| Precondiciones | Sesión iniciada como Jane. |
| Datos de entrada | Address vacío |
| Pasos | 1. Ir a `/shipping`. 2. Dejar Address vacío. 3. Clic en **Continue**. |
| Resultado esperado | El formulario no se envía y se muestra un mensaje de validación. |
| Resultado obtenido | El navegador bloquea el envío con "Please fill out this field." y la URL sigue en `/shipping`. |
| Estado | ✅ **Aprobado** |
| Evidencia | `CP-08-envio-campos-vacios.png` |

### CP-09 — Publicación de reseñas
| Campo | Valor |
|---|---|
| Objetivo | Verificar las reglas de las reseñas: requiere sesión y se permite una por usuario y producto. |
| Requisito | RF05 |
| Técnica | PE + transición de estados (sin sesión → con sesión → ya reseñado) |
| Precondiciones | Producto Sony Playstation 5 sin reseña de Jane. |
| Datos de entrada | Rating 5 con "Reseña QA primera" · Rating 3 con "Reseña QA duplicada" |
| Pasos | 1. Abrir el producto sin sesión. 2. Iniciar sesión como Jane. 3. Enviar la reseña con rating 5. 4. Enviar otra con rating 3. |
| Resultado esperado | 1) "Please sign in to write a review" · 3) "Review created successfully" · 4) "Product already reviewed" |
| Resultado obtenido | 1) "Please sign in to write a review" · 3) "Review created successfully" · 4) "Product already reviewed" |
| Estado | ✅ **Aprobado** |
| Evidencia | `CP-09-resena-sin-sesion.png`, `CP-09-resena-primera.png`, `CP-09-resena-duplicada.png` |
| Observación | La interfaz limita el rating a 1–5, pero la API acepta 0, 6 o 7 (ver DEF-05, detectado en las pruebas de integración). |

### CP-10 — Producto con precio y stock negativos
| Campo | Valor |
|---|---|
| Objetivo | Verificar que el administrador no puede guardar valores negativos. |
| Requisito | RF08 |
| Técnica | VL: por debajo del mínimo (precio < 0, stock < 0) |
| Precondiciones | Sesión iniciada como admin. |
| Datos de entrada | Nombre "Producto VL negativo", precio `-10`, stock `-3` |
| Pasos | 1. Admin → Products → **Create Product**. 2. Editar el producto creado. 3. Escribir los datos. 4. Clic en **Update**. |
| Resultado esperado | Se rechaza con un mensaje de validación y el producto no se guarda. |
| Resultado obtenido | Toast "Product updated". El listado muestra "Producto VL negativo **$-10**". |
| Estado | ❌ **Fallido** (DEF-06) |
| Evidencia | `CP-10-admin-precio-negativo-formulario.png`, `CP-10-admin-precio-negativo-guardado.png` |

### CP-11 — Carga de archivo que no es imagen
| Campo | Valor |
|---|---|
| Objetivo | Verificar que solo se aceptan imágenes jpg, jpeg, png y webp. |
| Requisito | RF08 |
| Técnica | PE: clase inválida (archivo .txt) |
| Precondiciones | Sesión iniciada como admin, en la edición de un producto. |
| Datos de entrada | Archivo `manuales-archivo-prueba.txt` |
| Pasos | 1. Editar un producto. 2. En "Image", seleccionar el archivo .txt. |
| Resultado esperado | Mensaje de error "Images only!" y la imagen del producto no cambia. |
| Resultado obtenido | Toast "Images only!". |
| Estado | ✅ **Aprobado** |
| Evidencia | `CP-11-admin-subir-txt.png` |

### CP-12 — Actualización del perfil
| Campo | Valor |
|---|---|
| Objetivo | Verificar la actualización del nombre y la validación de confirmación de contraseña. |
| Requisito | RF03, RNF07 |
| Técnica | PE: datos válidos / contraseñas no coincidentes |
| Precondiciones | Sesión iniciada como Jane. |
| Datos de entrada | Nombre "Jane QA" · Contraseña `nueva1` y confirmación `nueva2` |
| Pasos | 1. Ir a `/profile`. 2. Cambiar el nombre y clic en **Update**. 3. Escribir las contraseñas distintas y clic en **Update**. |
| Resultado esperado | 2) "Profile updated successfully" y la cabecera muestra "Jane QA" · 3) "Passwords do not match" |
| Resultado obtenido | 2) "Profile updated successfully" y la cabecera muestra "Jane QA" · 3) "Passwords do not match" |
| Estado | ✅ **Aprobado** |
| Evidencia | `CP-12-perfil-actualizado.png`, `CP-12-perfil-passwords-distintas.png` |

### CP-13 — Acceso al pedido de otro cliente
| Campo | Valor |
|---|---|
| Objetivo | Verificar que un cliente no puede ver pedidos ajenos. |
| Requisito | RF07 (control de acceso, OWASP A01) |
| Técnica | TD: autenticado = Sí, admin = No, dueño = No |
| Precondiciones | John crea un pedido. Jane tiene sesión iniciada en otro navegador. |
| Datos de entrada | URL `/order/<id del pedido de John>` |
| Pasos | 1. Como John, crear un pedido con la dirección "Carrera 65 # 98-12 (dirección privada de John)". 2. Copiar la URL del pedido. 3. Como Jane, abrir esa URL. |
| Resultado esperado | Acceso denegado (403/404). Jane no ve ningún dato del pedido. |
| Resultado obtenido | Jane **ve el pedido completo de John**: nombre, email `john@email.com`, dirección privada, productos y totales. |
| Estado | ❌ **Fallido** (DEF-02) |
| Evidencia | `CP-13-pedido-ajeno-visible.png` |

### CP-14 — Usabilidad en pantalla móvil de 375 px
| Campo | Valor |
|---|---|
| Objetivo | Verificar que la interfaz es usable en un móvil sin scroll horizontal. |
| Requisito | RNF06 |
| Técnica | Prueba de usabilidad (responsive) |
| Precondiciones | Viewport de 375×812 con emulación táctil. |
| Datos de entrada | — |
| Pasos | 1. Abrir `/` en el viewport móvil. 2. Verificar el ancho del documento. 3. Abrir el menú hamburguesa. |
| Resultado esperado | Ancho ≤ 375 px, menú hamburguesa visible, y al abrirlo se ven el buscador y Sign In. |
| Resultado obtenido | Ancho del documento de 375 px (sin scroll horizontal) y menú visible. Al abrirlo se ven el buscador y Sign In. |
| Estado | ✅ **Aprobado** |
| Evidencia | `CP-14-movil-inicio.png`, `CP-14-movil-menu-abierto.png` |

## 3.3 Casos automatizados E2E (Playwright)

**Ubicación:** `tests/e2e/specs/`. Cada prueba guarda una captura (`screenshot: 'on'`) y, si falla, también video y traza.

| ID | Nombre | Requisito | Técnica | Datos | Resultado esperado | Estado |
|---|---|---|---|---|---|---|
| E2E-01 | Inicio de sesión válido | RF01 | PE válida | john / 123456 | URL `/` y "John Doe" en la cabecera | ✅ Aprobado |
| E2E-02 | Contraseña incorrecta | RF01 | PE inválida | john / incorrecta | Toast "Invalid email or password" | ✅ Aprobado |
| E2E-03 | Registro: confirmación distinta y luego registro exitoso | RF02 | PE | 123456 / 1234567 | "Passwords do not match" y luego la cuenta creada | ✅ Aprobado |
| E2E-04 | Rutas protegidas sin sesión | RF09 | TD | /profile, /shipping, /admin/productlist | Redirige a `/login` | ✅ Aprobado |
| E2E-05 | Búsqueda con y sin resultados | RF04 | PE | iphone, zzzz | 1 y 0 productos | ✅ Aprobado |
| E2E-06 | Producto sin stock | RF06 | VL (stock = 0) | Echo Dot | "Out Of Stock" y botón deshabilitado | ✅ Aprobado |
| E2E-07 | Búsqueda con "(" | RF04 | PE inválida | ( | Sin error y 0 productos | ❌ Fallido esperado (DEF-10) |
| E2E-08 | Compra completa con verificación de totales | RF06 | TD + VL | Airpods × 2 | 179.98 / 0.00 / 27.00 / 206.98 y pedido creado | ✅ Aprobado |
| E2E-09 | Admin crea y edita un producto | RF08 | — | Teclado QA, 120.50, stock 4 | El producto se actualiza en el listado | ✅ Aprobado |
| E2E-10 | Un cliente no accede a la administración | RF09 | TD | john | Sin menú Admin y sin acceso a /admin | ✅ Aprobado |

**Resultado de la ejecución:** 10 pruebas en 17 s, 9 aprobadas y 1 que falla como se esperaba por DEF-10. Ver `evidencias/playwright/html-report/index.html`.

## 3.4 Casos automatizados de API e unitarios (Jest)

| Suite | Pruebas | Comportamiento correcto | Defectos documentados (`test.failing`) |
|---|---|---|---|
| `unit/calcPrices.test.js` | 11 | 11 | — |
| `unit/generateToken.test.js` | 3 | 3 | — |
| `unit/middleware.test.js` | 11 | 11 | — |
| `integration/users.api.test.js` | 21 | 14 | DEF-07 (×2), DEF-08, DEF-09 (×2), DEF-15, DEF-16 |
| `integration/products.api.test.js` | 24 | 18 | DEF-09, DEF-10, DEF-05 (×2), DEF-06 (×2) |
| `integration/orders.api.test.js` | 17 | 11 | DEF-09 (×2), DEF-01 (×2), DEF-04, DEF-02 |
| `integration/upload.api.test.js` | 4 | 3 | DEF-03 |
| **Total** | **91** | **70** | **21** |

> **Cómo leer la tabla:** `test.failing` documenta un defecto. La prueba afirma el comportamiento esperado y Jest la reporta en verde *mientras falle*. Si alguien corrige el defecto sin actualizar la prueba, Jest lo avisa con un error. Ver la convención en el README.
