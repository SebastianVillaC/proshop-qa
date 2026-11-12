// Prueba de humo de rendimiento (k6): 1 usuario virtual, 30 s.
// Verifica que los endpoints principales responden correctamente y mide el tiempo base.
// Ejecutar: docker run --rm -i -v "$PWD/evidencias/k6:/out" -e BASE_URL=http://host.docker.internal:5001 grafana/k6 run - < tests/performance/smoke.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

const BASE = __ENV.BASE_URL || 'http://localhost:5001';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const list = http.get(`${BASE}/api/products`, { tags: { endpoint: 'GET /api/products' } });
  check(list, { 'listado 200': (r) => r.status === 200 });

  const top = http.get(`${BASE}/api/products/top`, { tags: { endpoint: 'GET /api/products/top' } });
  check(top, { 'top 200': (r) => r.status === 200 });

  const id = list.json('products.0._id');
  const detail = http.get(`${BASE}/api/products/${id}`, { tags: { endpoint: 'GET /api/products/:id' } });
  check(detail, { 'detalle 200': (r) => r.status === 200 });
  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
    '/out/smoke-summary.txt': textSummary(data, { indent: ' ', enableColors: false }),
    '/out/smoke-summary.json': JSON.stringify(data, null, 2),
  };
}
