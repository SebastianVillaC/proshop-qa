# 4. Matriz de trazabilidad: requisitos, casos de prueba y defectos

Relaciona cada requisito con los casos que lo verifican en cada nivel y con los defectos encontrados. Permite comprobar que **todo requisito tiene al menos una prueba** y ver qué requisitos están comprometidos.

| Requisito | Casos manuales | E2E (Playwright) | API / unitarias (Jest) | No funcional / seguridad | Defectos | Estado del requisito |
|---|---|---|---|---|---|---|
| RF01 Autenticación | CP-01, CP-02 | E2E-01, E2E-02 | `users.api` RF01 (4), `generateToken` (3) | SEC-05, SEC-06, SEC-08 | DEF-11, DEF-13, DEF-15 | ❌ No cumple (seguridad) |
| RF02 Registro | CP-03, CP-04 | E2E-03 | `users.api` RF02 (7) | SEC-07 | DEF-07, DEF-08, DEF-09 | ❌ No cumple |
| RF03 Perfil | CP-12 | — | `users.api` RF03 (5) | SEC-11 | DEF-09 | ⚠️ Cumple en lo funcional; manejo de error (500) |
| RF04 Catálogo y búsqueda | CP-05 | E2E-05, E2E-07 | `products.api` RF04 (12) | ZAP 40018, SEC-04 | DEF-09, DEF-10 | ❌ No cumple (caracteres especiales) |
| RF05 Reseñas | CP-09 | — | `products.api` RF05 (5) | — | DEF-05 | ⚠️ La interfaz cumple; la API acepta rangos inválidos |
| RF06 Pedido y precios | CP-06, CP-07, CP-08 | E2E-06, E2E-08 | `calcPrices` (11), `orders.api` RF06 (10) | SEC-03, SEC-12 | DEF-01, DEF-04, DEF-09 | ❌ No cumple (validación de cantidades) |
| RF07 Consulta de pedidos | CP-13 | — | `orders.api` RF07 (7) | SEC-01 | DEF-02 (corregido) | ✅ Cumple después de corregir DEF-02 |
| RF08 Admin de productos | CP-10, CP-11 | E2E-09 | `products.api` RF08 (5), `upload.api` (4) | SEC-02, SonarQube S5693 | DEF-03, DEF-06 | ❌ No cumple |
| RF09 Control de acceso por rol | — | E2E-04, E2E-10 | `middleware` admin (3), pruebas 401 de cada suite | SEC-11, SEC-13 | DEF-03, DEF-16 | ⚠️ La interfaz cumple; la API tiene una ruta sin proteger (upload) |
| RNF01 Tiempo de respuesta | — | — | — | k6 `load.js`, `stress.js` | — | ✅ Cumple con 50 VUs (p95 1.13 s) |
| RNF02 Tasa de errores bajo carga | — | — | — | k6 `load.js`, `stress.js` | — | ✅ Cumple (0 %) |
| RNF03 Errores 4xx ante entradas inválidas | — | — | 6 pruebas `[DEF-09]` | ZAP 90022 / 100000 | DEF-09 | ❌ No cumple |
| RNF04 Contraseñas con hash y no expuestas | — | — | `users.api` (perfil y login sin password) | SEC-13 | DEF-16 | ⚠️ Parcial |
| RNF05 Seguridad OWASP | — | — | Pruebas `[DEF-xx]` de seguridad | SonarQube, ZAP, npm audit, owasp-checks | DEF-01–03, 10–13, 15–17 | ❌ No cumple |
| RNF06 Responsive (375 px) | CP-14 | — | — | — | — | ✅ Cumple |
| RNF07 Mensajes de error visibles | CP-02, CP-08, CP-11, CP-12 | E2E-02, E2E-03 | — | — | DEF-10 (mensaje técnico), DEF-14 | ⚠️ Parcial |
| RNF08 Mantenibilidad (A y < 5 % duplicación) | — | — | — | SonarQube | — | ✅ Cumple (A, 3.6 %) |
| RNF09 Accesibilidad ≥ 90 | — | — | — | Lighthouse | DEF-18 | ❌ No cumple (84 / 83) |

## Cobertura de requisitos

| Indicador | Valor |
|---|---|
| Requisitos con al menos una prueba | **18 / 18 (100 %)** |
| Requisitos verificados en más de un nivel (manual, E2E, API o no funcional) | 13 / 18 (72 %) |
| Requisitos que cumplen totalmente | 5 / 18 (28 %): RF07, RNF01, RNF02, RNF06 y RNF08 |
| Requisitos con defectos abiertos | 13 / 18 (72 %) |

> Nota: RF07 aparece como cumplido solo después de corregir y verificar DEF-02 (ver `docs/08`). Antes de la corrección, solo 4 / 18 requisitos (22 %) cumplían.
