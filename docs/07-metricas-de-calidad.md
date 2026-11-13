# 7. Métricas de calidad

## 7.1 KPIs del proceso de pruebas

### Casos aprobados y fallidos

**Ciclo 1:** ejecución inicial, antes de cualquier corrección.

| Tipo de caso | Ejecutados | Aprobados | Fallidos (revelan un defecto) | % de aprobación |
|---|---|---|---|---|
| Manuales (CP-01 a CP-14) | 14 | 9 | 5 | 64.3 % |
| E2E automatizados (Playwright) | 10 | 9 | 1 | 90.0 % |
| API y unitarios automatizados (Jest) | 91 | 70 | 21 | 76.9 % |
| **Total** | **115** | **88** | **27** | **76.5 %** |

**Ciclo 2:** regresión después de corregir DEF-02.

| Tipo de caso | Ejecutados | Aprobados | Fallidos | % de aprobación |
|---|---|---|---|---|
| Manuales (se reejecutó CP-13) | 14 | 10 | 4 | 71.4 % |
| E2E | 10 | 9 | 1 | 90.0 % |
| API y unitarios | 91 | 71 | 20 | 78.0 % |
| **Total** | **115** | **90** | **25** | **78.3 %** |

**Interpretación:** casi una de cada cuatro pruebas encontró un defecto. Es una tasa alta, esperable en un sistema sin pruebas previas y diseñado sin validación del lado del servidor. Los casos **manuales** tienen la menor tasa de aprobación (64 %) porque se diseñaron con PE y VL para atacar los bordes. El E2E tiene la más alta (90 %) porque prueba los *flujos felices* por la interfaz, que valida parte de las entradas.

### Cobertura de pruebas

| Tipo | Valor | Fuente |
|---|---|---|
| Cobertura de líneas del backend | **86.0 %** (956 de 1.117 líneas a cubrir) | SonarQube y Jest v8 |
| Cobertura de ramas del backend | **90.4 %** | SonarQube |
| Cobertura de requisitos | **100 %** (18/18 con al menos una prueba) | `docs/04` |
| Cobertura del frontend | No medida con instrumentación. Se valida con 10 E2E y 14 manuales | — |

Las líneas no cubiertas se concentran en `utils/paypal.js` (37 %, integración externa fuera de alcance) y en ramas de error de `userController` (actualizar y eliminar usuario como admin). Excluyendo PayPal, la cobertura de líneas del backend es del 90.2 %.

### Defectos

| KPI | Fórmula | Valor | Interpretación |
|---|---|---|---|
| **Defectos totales** | — | **18** | 3 críticos, 5 altos, 7 medios y 3 bajos |
| **Densidad de defectos** | defectos / KLOC | 18 / 3.525 KLOC = **5.1 defectos/KLOC** | Por encima del rango de 1–5 que suele citarse para software comercial maduro, aunque cerca del límite superior. Es coherente con un proyecto académico de referencia sin QA formal |
| **Tasa de defectos por caso** | defectos únicos / casos ejecutados | 18 / 115 = **0.16** | 1 defecto nuevo por cada 6.4 casos |
| **Efectividad de los casos** | casos que fallan / casos ejecutados | 27 / 115 = **23.5 %** | — |
| **% Críticos + Altos** | (C + A) / total | 8 / 18 = **44 %** | Severidad alta concentrada en seguridad y pedidos |
| **Defectos de seguridad** | con categoría OWASP / total | 14 / 18 = **78 %** | La seguridad es el atributo más débil |
| **Eficiencia de remoción (al cierre)** | corregidos / encontrados | 1 / 18 = **5.6 %**. De los P1: 1 / 6 = 16.7 % | El alcance del caso práctico es detectar. Solo se corrigió DEF-02 para demostrar el ciclo |
| **Densidad por módulo** | — | Autenticación y registro: 5 · Pedidos: 3 · Productos y reseñas: 4 · Transversal, configuración y usuarios: 4 · Interfaz: 2 | — |

### Tiempos de ejecución

| Suite | Tiempo | Frecuencia recomendada |
|---|---|---|
| Unitarias e integración (91 pruebas) | ~9 s | En cada commit |
| E2E Playwright (10 pruebas) | ~18 s | En cada push o PR |
| k6 smoke | 30 s | En cada push |
| k6 carga | 2 min | Nocturna |
| k6 estrés | 2 min 20 s | Antes de cada release |
| Análisis de SonarQube | 23 s (escaneo) | En cada push |
| Total automatizado (sin estrés) | **< 4 min** | — |

El análisis estático, las pruebas unitarias y las E2E juntas toman menos de un minuto. Eso permite ejecutarlas en cada commit sin frenar al equipo, un requisito práctico para que el CI se use de verdad.

## 7.2 Análisis de SonarQube

**Configuración:** SonarQube Community Build 26.11 en Docker, con el perfil de calidad **"Sonar way extended"** (252 reglas JS/TS). El perfil por defecto de esta versión, "Sonar way core" (200 reglas), reportaba 0 code smells. Se eligió el extendido porque es más cercano al "Sonar way" clásico y da un análisis más útil. Se analizaron `app/backend` y `app/frontend/src` (63 archivos, 3.525 líneas de código), con la cobertura de Jest (`coverage/lcov.info`).

Capturas: `evidencias/sonarqube/01-dashboard-overall.png` a `08-security-hotspots.png`. Datos crudos: `measures.json`, `issues.json`.

| Métrica | Valor | Rating | Interpretación |
|---|---|---|---|
| **Bugs** | 15 (20 issues de confiabilidad en el modelo MQR) | **C** (Reliability) | 14 de 15 son la regla S9383 (*promises must be awaited*): llamadas `async` sin `await` ni `.catch` (`refetch()`, `connectDB()`, `deleteProduct(id)`). En `ProductListScreen` y `UserListScreen`, `await deleteProduct(id)` sin `.unwrap()` hace que **los errores de borrado nunca lleguen al `catch`**: el usuario no ve el fallo. El otro bug (S1764, `Rating.jsx:51`, `text && text`) es una expresión redundante inofensiva. |
| **Vulnerabilidades** | 2 | **C** (Security) | S5693, `uploadRoutes.js`: la carga sin límite de tamaño, de severidad mayor, determina la C. S5689, `app.js`: Express expone su versión (X-Powered-By). Ambas confirmadas por ZAP (ver `docs/06`). |
| **Security Hotspots** | 0 | A | SonarQube Community **no hace taint analysis** (lo advierte el dashboard). Por eso no marcó la inyección NoSQL ni la de regex, que sí se confirmaron dinámicamente. |
| **Code Smells** | 5 | **A** (Maintainability) | `Array()` en vez de `new Array()` (×3), espaciado ambiguo en JSX (`Header.jsx`) e `instanceof` en `reportWebVitals.js`. Son menores. |
| **Deuda técnica** | 25 min (ratio de deuda 0.0 %) | A | Muy baja: el código es pequeño, legible y sigue convenciones. |
| **Duplicación** | **3.6 %** (149 líneas, 12 bloques en 5 archivos) | — | Se concentra en los formularios del frontend: `ProfileScreen` (31.5 %), `RegisterScreen` (34.2 %), `LoginScreen` (21.3 %), `UserEditScreen` y `OrderListScreen`. Los `Form.Group` de email y contraseña se repiten. Se podría extraer un componente `<FormField>`. |
| **Coverage** | **86.0 %** (ramas 90.4 %) | — | Alta para el backend. El frontend se excluyó de la cobertura en `sonar.coverage.exclusions` porque se valida con E2E. |
| **Complejidad** | Ciclomática 413 · cognitiva 230 · 228 funciones | — | Media de 1.8 por función. No hay funciones complejas. |
| **Quality Gate** | **Passed** | — | ⚠️ Pasa porque la condición por defecto evalúa solo *código nuevo* (`new_violations = 0`) y este es el primer análisis. **No significa que el código sea seguro**: el gate no considera el C de seguridad ni de confiabilidad del código general. |

### Interpretación técnica

1. **La mantenibilidad es buena y la seguridad y la confiabilidad no.** El código de ProShop es limpio (A, deuda de 25 min y 3.6 % de duplicación). Pero la calidad *interna* que mide SonarQube no equivale a calidad *externa*: el sistema tiene 3 vulnerabilidades críticas que el análisis estático no detectó. Un código fácil de leer puede seguir siendo inseguro si le faltan validaciones de negocio.
2. **Los bugs de SonarQube coinciden con defectos de experiencia de usuario.** El patrón S9383 en los handlers de borrado explica un comportamiento que vimos: si el borrado falla, la interfaz no muestra error.
3. **El Quality Gate por defecto da una falsa sensación de seguridad.** Proponemos un gate del equipo para el código general: `Security Rating ≥ A`, `Reliability Rating ≥ B`, `Coverage ≥ 80 %` y `Duplicated Lines < 5 %`. Con él, **el proyecto fallaría el gate** por los ratings de seguridad y confiabilidad, que es el diagnóstico correcto.
4. **Cobertura alta no implica ausencia de defectos.** Con un 86 % de cobertura seguimos teniendo 20 pruebas que fallan por defectos abiertos. La cobertura mide qué se ejecutó, no si las aserciones son buenas. Por eso se complementó con técnicas de diseño (PE, VL, TD).

## 7.3 Tablero resumen

| Atributo (ISO 25010) | Indicador principal | Meta | Resultado | Estado |
|---|---|---|---|---|
| Funcionalidad | % de casos aprobados (ciclo 2) | ≥ 90 % | 78.3 % | ❌ |
| Fiabilidad | Errores bajo carga nominal / Reliability Rating | < 1 % / ≥ B | 0 % / C | ⚠️ |
| Rendimiento | p95 con 50 VUs | < 3 s | 1.13 s | ✅ |
| Usabilidad | Accesibilidad Lighthouse / responsive | ≥ 90 / sí | 84 / sí | ⚠️ |
| Seguridad | Vulnerabilidades críticas abiertas / Security Rating | 0 / A | 2 (después de corregir DEF-02) / C | ❌ |
| Mantenibilidad | Maintainability Rating / duplicación | A / < 5 % | A / 3.6 % | ✅ |
