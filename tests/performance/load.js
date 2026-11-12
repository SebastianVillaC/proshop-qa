// Prueba de carga (k6) - RNF01: el 95 % de las peticiones debe responder en < 3 s
// y la tasa de error debe ser < 1 % con hasta 50 usuarios concurrentes.
// Escenario mixto que simula navegación real: catálogo, búsqueda, detalle e inicio de sesión.
// Ejecutar: docker run --rm -i -v "$PWD/evidencias/k6:/out" -e BASE_URL=http://host.docker.internal:5001 grafana/k6 run - < tests/performance/load.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

const BASE = __ENV.BASE_URL || 'http://localhost:5001';
const loginTrend = new Trend('login_duration', true);
const catalogTrend = new Trend('catalog_duration', true);

export const options = {
  scenarios: {
    navegacion: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 }, // rampa de subida
        { duration: '1m', target: 50 },  // carga sostenida máxima
        { duration: '30s', target: 0 },  // rampa de bajada
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],        // RNF01
    http_req_failed: ['rate<0.01'],           // RNF02 (fiabilidad)
    'checks': ['rate>0.99'],
    'catalog_duration': ['p(95)<1000'],
    'login_duration': ['p(95)<3000'],
  },
};

const KEYWORDS = ['phone', 'sony', 'camera', 'mouse', 'echo'];

export default function () {
  group('catálogo', () => {
    const r = http.get(`${BASE}/api/products`, { tags: { endpoint: 'GET /api/products' } });
    catalogTrend.add(r.timings.duration);
    check(r, { 'catálogo 200': (res) => res.status === 200 });

    const kw = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
    const s = http.get(`${BASE}/api/products?keyword=${kw}`, { tags: { endpoint: 'GET /api/products?keyword' } });
    catalogTrend.add(s.timings.duration);
    check(s, { 'búsqueda 200': (res) => res.status === 200 });

    const id = r.json('products.0._id');
    const d = http.get(`${BASE}/api/products/${id}`, { tags: { endpoint: 'GET /api/products/:id' } });
    catalogTrend.add(d.timings.duration);
    check(d, { 'detalle 200': (res) => res.status === 200 });
  });

  sleep(1);

  group('login', () => {
    const res = http.post(
      `${BASE}/api/users/auth`,
      JSON.stringify({ email: 'john@email.com', password: '123456' }),
      { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'POST /api/users/auth' } }
    );
    loginTrend.add(res.timings.duration);
    check(res, { 'login 200': (r) => r.status === 200 });
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
    '/out/load-summary.json': JSON.stringify(data, null, 2),
    '/out/load-summary.txt': textSummary(data, { indent: ' ', enableColors: false }),
  };
}
