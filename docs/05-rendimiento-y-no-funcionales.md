# 5. Pruebas de rendimiento y no funcionales

## 5.1 Ambiente y método

| Elemento | Valor |
|---|---|
| Herramienta | k6, ejecutado en Docker (`grafana/k6`) contra `http://host.docker.internal:5001` |
| SUT | Backend Express en modo desarrollo (nodemon), con un solo proceso Node.js |
| Base de datos | MongoDB 7 en Docker con los datos semilla (6 productos y 3 usuarios) |
| Máquina | MacBook (Apple Silicon), Docker Desktop con 6 CPU y 10 GB asignados |
| Scripts | `tests/performance/smoke.js`, `load.js`, `stress.js` |
| Evidencias | `evidencias/k6/*-summary.txt` y `.json`, `stress-timeseries.csv.gz`, `stress-por-ventana.md` |

**Escenario de usuario simulado (`load.js`):** consultar el catálogo, buscar por una palabra aleatoria, ver el detalle de un producto, pausa de 1 s, iniciar sesión y pausa de 1 s. Así se combinan lecturas livianas con la operación más costosa del sistema, que es la verificación de la contraseña con bcrypt.

## 5.2 Resultados

### Prueba de humo: 1 VU, 30 s

| Métrica | Valor |
|---|---|
| Peticiones | 90 (3 req/s) |
| Tiempo de respuesta: promedio, mediana y p95 | 4.2 ms, 3.4 ms y **8.4 ms** |
| Errores | 0 % |
| Umbrales (p95 < 1 s, errores < 1 %) | ✅ Cumplidos |

Esta es la línea base: sin concurrencia, la API responde en milisegundos.

### Prueba de carga: 0 → 20 → 50 VUs, 2 min (RNF01 y RNF02)

| Métrica | Valor | Umbral | Resultado |
|---|---|---|---|
| Peticiones totales | 4.516 (37.5 req/s) | — | — |
| `http_req_duration`: promedio, mediana, p90 | 206 ms, 7 ms, 791 ms | — | — |
| **`http_req_duration` p95** | **1.133 ms** | < 3.000 ms (RNF01) | ✅ |
| `http_req_failed` | **0.00 %** | < 1 % (RNF02) | ✅ |
| `checks` | 100 % (4.516/4.516) | > 99 % | ✅ |
| `catalog_duration` p95 | 616 ms | < 1.000 ms | ✅ |
| `login_duration` p95 | 1.424 ms | < 3.000 ms | ✅ |

> Se hicieron dos corridas. La primera (`evidencias/k6/corrida-1-con-interferencia-sonarqube/`) coincidió con el arranque y el análisis de SonarQube en la misma máquina, y dio un p95 de 1.24 s. La segunda, con el sistema en reposo, es la que se reporta. Que la diferencia sea pequeña (8 %) indica que los resultados son estables.

### Prueba de estrés: escalones de 50 / 100 / 150 / 200 VUs, 2 min 20 s

| Ventana (s) | VUs máx | Peticiones | p95 catálogo (ms) | p95 login (ms) | ¿Cumple RNF01? |
|---|---|---|---|---|---|
| 0–15 | 25 | 387 | 133 | 202 | Sí |
| 15–30 | 49 | 582 | 768 | 1.110 | Sí |
| 30–45 | 74 | 598 | 1.460 | 1.984 | Sí |
| 45–60 | 99 | 570 | 1.853 | 2.596 | Sí |
| 60–75 | 124 | 630 | 3.496 | 3.260 | **No** |
| 75–90 | 149 | 603 | 4.974 | 4.074 | **No** |
| 90–105 | 174 | 576 | 5.473 | 4.047 | **No** |
| 105–120 | 199 | 557 | 8.149 | 4.757 | **No** |

Totales: 5.214 peticiones, **0 % de errores**, p95 global de 5.03 s y un máximo de 21.3 s, que corresponde a la cola acumulada que se vació en la rampa de bajada.

## 5.3 Análisis

1. **Cumplimiento.** Con la carga nominal de 50 usuarios concurrentes, el sistema **cumple RNF01** (p95 de 1.13 s frente a 3 s) y **RNF02** (0 % de errores).
2. **Punto de saturación.** El throughput se estanca en unas **37 req/s** sin importar si hay 50 o 200 VUs. Desde ahí, agregar usuarios solo alarga la cola y la latencia. El RNF01 deja de cumplirse entre **100 y 125 usuarios concurrentes**, así que esa es la capacidad efectiva de una instancia.
3. **Cuello de botella.** El login cuesta unos 50 ms de CPU sin carga, y es la verificación de la contraseña con **bcryptjs**, una implementación en JavaScript puro que corre en el hilo principal de Node.js. Como Node tiene **un solo event loop**, mientras se calculan los hashes **también se demoran las peticiones del catálogo**, que por sí solas tardan unos 3 ms: su p95 sube de 8 ms en la prueba de humo a 616 ms con 50 VUs. Es un problema de diseño de la escalabilidad, no de la base de datos.
4. **Estabilidad (fiabilidad).** Aun con 200 VUs **no se produjeron errores ni caídas del proceso**: el sistema se degrada sin romperse. Es un comportamiento positivo, pero sin rate limiting ni timeouts un atacante podría provocar esa degradación a propósito con logins masivos (relacionado con DEF-11).

**Recomendaciones:**

- Reemplazar `bcryptjs` por `bcrypt` (nativo, ejecuta el hash en el threadpool de libuv).
- Ejecutar varias instancias con PM2 en modo cluster o detrás de un balanceador.
- Agregar caché (por ejemplo `Cache-Control` o Redis) a `GET /api/products` y `/top`, que son lecturas repetitivas.
- Aplicar rate limiting al login (`express-rate-limit`). Reduce la carga y mitiga la fuerza bruta.
- Repetir las pruebas sobre el build de producción y no sobre nodemon.

## 5.4 Pruebas no funcionales de usabilidad y accesibilidad (Lighthouse)

Se auditó la página de inicio sobre el **build de producción** (`npm run build`, servido por Express con `NODE_ENV=production`). El servidor de desarrollo de CRA no está minificado y distorsionaría las métricas. Reportes: `evidencias/lighthouse/home-desktop.report.html` y `home-mobile.report.html`.

| Categoría | Escritorio | Móvil (Moto G emulado, red 4G lenta) |
|---|---|---|
| Rendimiento | 97 | **64** |
| Accesibilidad | **84** | **83** |
| Buenas prácticas | 100 | 96 |
| SEO | 92 | 92 |
| LCP (Largest Contentful Paint) | 1.1 s | **6.0 s** |
| FCP (First Contentful Paint) | 0.9 s | 2.0 s |
| CLS (Cumulative Layout Shift) | 0 | **0.247** |
| TBT (Total Blocking Time) | 0 ms | 0 ms |

**Hallazgos de accesibilidad** (incumplen RNF09, que exige ≥ 90; registrados como **DEF-18**):

- `image-alt`: imágenes de las tarjetas de producto sin el atributo `alt` (`Product.jsx`, `Card.Img`).
- `link-name`: enlaces sin texto accesible (la imagen enlazada de la tarjeta).
- `color-contrast`: contraste insuficiente entre el texto y el fondo.
- `heading-order`: los encabezados no siguen un orden jerárquico.

**Hallazgos de rendimiento en móvil:**

- `uses-text-compression`: el servidor no comprime las respuestas, con un ahorro posible de 549 KiB. Se resuelve con el middleware `compression`.
- `unused-javascript` y `unused-css-rules`: unos 234 KiB de JS y 233 KiB de CSS sin usar (Bootstrap completo).
- `modern-image-formats` y `uses-optimized-images`: las imágenes JPG del catálogo se podrían reducir unos 190 KiB con WebP o AVIF.
- `render-blocking-resources`: unos 1.200 ms de recursos que bloquean el renderizado.
- CLS de 0.247 causado por el carrusel, cuyas imágenes no tienen dimensiones reservadas.

## 5.5 Otras evidencias no funcionales

| Atributo | Evidencia | Resultado |
|---|---|---|
| Usabilidad responsive (RNF06) | CP-14: viewport de 375×812 | ✅ Sin scroll horizontal y con menú hamburguesa funcional |
| Mensajes de error (RNF07) | CP-02, CP-08, CP-11, CP-12 y E2E-02/03 | ✅ Errores visibles. ⚠️ Con DEF-10, el mensaje expuesto es técnico ("Regular expression is invalid…") |
| Fiabilidad ante entradas inválidas (RNF03) | Pruebas `[DEF-09]` | ❌ 6 escenarios responden 500 en vez de 4xx |
| Estabilidad bajo estrés | `stress.js` | ✅ 0 errores con 200 VUs. ❌ Latencia fuera del RNF01 desde unos 120 VUs |
