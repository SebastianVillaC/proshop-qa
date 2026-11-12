// Prueba de estrés (k6): incrementa la carga más allá de la nominal (50 VUs) hasta 200 VUs
// para identificar el punto de degradación respecto al RNF01 (p95 < 3 s).
// Los umbrales NO abortan la prueba: el objetivo es observar dónde se rompen.
// Ejecutar: docker run --rm -i -v "$PWD/evidencias/k6:/out" -e BASE_URL=http://host.docker.internal:5001 grafana/k6 run - < tests/performance/stress.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

const BASE = __ENV.BASE_URL || 'http://localhost:5001';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 150 },
    { duration: '30s', target: 200 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    'http_req_duration{endpoint:catalogo}': ['p(95)<3000'],
    'http_req_duration{endpoint:login}': ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const r = http.get(`${BASE}/api/products`, { tags: { endpoint: 'catalogo' } });
  check(r, { 'catálogo 200': (res) => res.status === 200 });
  const l = http.post(
    `${BASE}/api/users/auth`,
    JSON.stringify({ email: 'jane@email.com', password: '123456' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login' } }
  );
  check(l, { 'login 200': (res) => res.status === 200 });
  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
    '/out/stress-summary.json': JSON.stringify(data, null, 2),
    '/out/stress-summary.txt': textSummary(data, { indent: ' ', enableColors: false }),
  };
}
