# Análisis dinámico (DAST) con OWASP ZAP

ZAP corre en Docker (`zaproxy/zap-stable`) contra la app en ejecución. El repositorio se monta en `/zap/wrk` para que los reportes queden en `evidencias/zap/`.

> **Requisitos:** la app debe estar levantada (`npm run app:dev`) y la BD sembrada. Ejecute los comandos desde la raíz del repositorio.
> En Linux, `--add-host=host.docker.internal:host-gateway` permite que el contenedor llegue al host. En Windows y Mac no hace daño.
> En Windows PowerShell, reemplace `"$PWD"` por `"${PWD}"` y `\` por `` ` `` al final de cada línea.

## 1. Escaneo baseline (pasivo) del frontend

Recorre la SPA con el spider y analiza pasivamente las respuestas (cabeceras, cookies, divulgación de información). No ataca.

```bash
docker run --rm --add-host=host.docker.internal:host-gateway -v "$PWD:/zap/wrk:rw" -t zaproxy/zap-stable \
  zap-baseline.py -t http://host.docker.internal:3000 -j -m 3 -I \
  -r evidencias/zap/baseline-frontend.html -J evidencias/zap/baseline-frontend.json -w evidencias/zap/baseline-frontend.md
```

## 2. Escaneo activo autenticado de la API (OpenAPI)

Importa `security/zap/openapi.yaml`, que tiene los endpoints de ProShop reconstruidos de `backend/routes`, y lanza el **escaneo activo**: inyección, XSS, path traversal y otros. La sesión de un **cliente no administrador** se inyecta en cada petición con el *replacer* de ZAP, para no ejecutar operaciones destructivas de admin.

```bash
# Obtener la cookie JWT del usuario john (cliente)
JWT=$(curl -s -D - -o /dev/null -H 'Content-Type: application/json' \
  -d '{"email":"john@email.com","password":"123456"}' http://localhost:5001/api/users/auth \
  | grep -i set-cookie | sed -E 's/.*jwt=([^;]+).*/\1/')

docker run --rm --add-host=host.docker.internal:host-gateway -v "$PWD:/zap/wrk:rw" -t zaproxy/zap-stable \
  zap-api-scan.py -t /zap/wrk/security/zap/openapi.yaml -f openapi -I \
  -r evidencias/zap/api-scan.html -J evidencias/zap/api-scan.json -w evidencias/zap/api-scan.md \
  -z "-config replacer.full_list(0).description=auth_cookie -config replacer.full_list(0).enabled=true \
      -config replacer.full_list(0).matchtype=REQ_HEADER -config replacer.full_list(0).matchstr=Cookie \
      -config replacer.full_list(0).regex=false -config replacer.full_list(0).replacement=jwt=$JWT"
```

> El escaneo activo crea pedidos, reseñas y usuarios de prueba. Al terminar, ejecute `npm run app:seed` para restaurar los datos.

## 3. Verificaciones dirigidas OWASP Top 10

ZAP no detecta fallas de control de acceso ni de lógica de negocio. Para eso se usa el script propio:

```bash
npm run app:seed
node security/owasp-checks.mjs            # -> evidencias/seguridad/owasp-checks.md
```

El análisis de los resultados (verdaderos y falsos positivos, impacto y mitigación) está en `docs/06-seguridad-owasp.md`.
