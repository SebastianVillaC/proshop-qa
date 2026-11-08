# ProShop QA — Caso práctico final de Aseguramiento de la Calidad

Repositorio del caso práctico final (20 %) de **Aseguramiento de la Calidad**, en Ingeniería de Sistemas del ITM. Aquí se planifican, diseñan, ejecutan y documentan las actividades de QA sobre un sistema real: **ProShop v2**, un e-commerce construido con el stack MERN.

> **Sistema bajo prueba (SUT):** [bradtraversy/proshop-v2](https://github.com/bradtraversy/proshop-v2), licencia MIT, © 2023 Traversy Media.
> Se importó en `app/` desde el commit `e23e3a8` (8 de junio de 2024). Las únicas modificaciones al código original están en la sección [Cambios sobre el código original](#cambios-sobre-el-código-original).

## Estructura

| Ruta | Contenido |
|---|---|
| `app/` | Código de ProShop v2: backend con Express y Mongoose, frontend con React y Redux Toolkit |
| `tests/unit/` | Pruebas unitarias del backend (Jest) |
| `tests/integration/` | Pruebas de integración de la API REST (Jest, Supertest y MongoDB en memoria) |
| `tests/e2e/` | Pruebas E2E automatizadas de la interfaz (Playwright) |
| `tests/performance/` | Pruebas de rendimiento y carga (k6) |
| `security/zap/` | Configuración del análisis dinámico con OWASP ZAP |
| `sonar-project.properties` | Configuración del análisis estático con SonarQube |
| `docs/` | Plan de pruebas, casos de prueba, defectos, seguridad y métricas |
| `evidencias/` | Reportes exportados y capturas de cada ejecución |
| `.github/` | Pipeline de CI (GitHub Actions) y plantillas de reporte de defectos |

## Requisitos

- Node.js 20 o superior (probado con 24.15)
- Docker Desktop, para MongoDB, SonarQube, OWASP ZAP y k6
- Git

## Puesta en marcha del sistema bajo prueba

```bash
# 1. Base de datos
docker compose up -d mongo

# 2. Dependencias (raíz de QA, backend y frontend)
npm install
npm run app:install

# 3. Variables de entorno
cp app/.env.example app/.env        # editar JWT_SECRET

# 4. Datos semilla (3 usuarios y 6 productos)
npm run app:seed

# 5. Levantar la app: frontend en http://localhost:3000 y API en http://localhost:5001
npm run app:dev
```

Usuarios semilla (contraseña `123456`): `admin@email.com` (administrador), `john@email.com` y `jane@email.com` (clientes).

## Ejecución de pruebas

| Tipo | Comando | Reporte |
|---|---|---|
| Unitarias e integración | `npm test` | consola + `evidencias/jest/junit-backend.xml` |
| Cobertura | `npm run test:coverage` | `coverage/lcov-report/index.html` |
| E2E (con la app arriba) | `cd tests/e2e && npm install && npx playwright install chromium && npm test` | `evidencias/playwright/html-report` |
| Rendimiento (smoke) | `docker run --rm -i -v "$PWD/evidencias/k6:/out" -e BASE_URL=http://host.docker.internal:5001 grafana/k6 run - < tests/performance/smoke.js` | `evidencias/k6/` |
| Carga | igual, con `load.js` | `evidencias/k6/` |
| SonarQube | ver `docs/07-metricas-de-calidad.md` | dashboard en http://localhost:9000 |
| OWASP ZAP | ver `security/zap/README.md` | `evidencias/zap/` |

### Convención para defectos conocidos

Las pruebas que encuentran un defecto confirmado se marcan con `test.failing` (Jest) o `test.fail` (Playwright) y llevan en el nombre el identificador del defecto, por ejemplo `[DEF-02]`.

- La prueba describe el comportamiento **esperado** y hoy falla a causa del defecto, por eso la suite queda en verde.
- Cuando el defecto se corrige, el runner avisa. En ese momento la marca se quita y la prueba pasa a ser de **regresión**.

El registro completo está en `docs/08-gestion-de-defectos.md` y en GitHub Issues.

## Cambios sobre el código original

1. `app/frontend/package.json`: el proxy pasa de `:5000` a `:5001`. En macOS el puerto 5000 lo ocupa el receptor AirPlay. `PORT=5001` está en `app/.env.example`.
2. `app/package-lock.json` y `app/frontend/package-lock.json` se regeneraron porque los originales **no estaban sincronizados** con `package.json` (les faltaban `@types/express` y `markdown-toc`) y `npm ci` fallaba. Las versiones instaladas no cambian.

## Equipo

| Integrante | Responsabilidad principal |
|---|---|
| Sebastián Villa | Contexto y requisitos, pruebas unitarias y de integración, SonarQube y métricas |
| Integrante 2 | Plan de pruebas, casos de prueba manuales, automatización E2E y CI/CD |
| Integrante 3 | Rendimiento, seguridad (OWASP ZAP y Top 10) y gestión de defectos |
