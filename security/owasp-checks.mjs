// Pruebas de seguridad manuales-automatizadas basadas en OWASP Top 10 (2021).
// Complementan a SonarQube (SAST) y OWASP ZAP (DAST) verificando de forma dirigida
// los riesgos que las herramientas no detectan (control de acceso, lógica de negocio).
//
// Uso (con la app corriendo y datos semilla):  node security/owasp-checks.mjs [http://localhost:5001] [archivo-salida.md]
// Salida: evidencias/seguridad/owasp-checks.md por defecto (+ resumen por consola)
import fs from 'fs';
import path from 'path';

const API = (process.argv[2] || 'http://localhost:5001') + '/api';
const OUT = path.resolve('evidencias/seguridad');
const OUT_FILE = process.argv[3] || 'owasp-checks.md';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const log = [];
const md = (s = '') => log.push(s);

async function call(method, url, { body, cookie, form } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const t0 = performance.now();
  const res = await fetch(API + url, { method, headers, body: payload });
  const ms = Math.round(performance.now() - t0);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, headers: res.headers, json, ms };
}

async function login(email, password = '123456') {
  const res = await fetch(API + '/users/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}

function check(id, owasp, title, vulnerable, evidence) {
  results.push({ id, owasp, title, vulnerable });
  md(`### ${id} — ${title}`);
  md(`- **OWASP:** ${owasp}`);
  md(`- **Resultado:** ${vulnerable ? '❌ VULNERABLE' : '✅ No vulnerable / control efectivo'}`);
  md('- **Evidencia:**');
  md('```');
  md(evidence.trim());
  md('```');
  md();
}

const short = (o) => JSON.stringify(o).slice(0, 300);

(async () => {
  md(`# Verificaciones de seguridad OWASP Top 10 — ProShop v2`);
  md(`Fecha de ejecución: ${new Date().toISOString()}  `);
  md(`Objetivo: ${API}`);
  md();

  const john = await login('john@email.com');
  const jane = await login('jane@email.com');
  const products = (await call('GET', '/products')).json.products;
  const pid = products[0]._id;
  const shipping = { address: 'Calle 1', city: 'Medellín', postalCode: '050001', country: 'CO' };

  // SEC-01 IDOR en pedidos (A01)
  const order = await call('POST', '/orders', {
    cookie: john,
    body: { orderItems: [{ _id: pid, name: 'x', image: '/x.jpg', price: 1, qty: 1 }], shippingAddress: shipping, paymentMethod: 'PayPal' },
  });
  const idor = await call('GET', `/orders/${order.json._id}`, { cookie: jane });
  check('SEC-01', 'A01:2021 Broken Access Control', 'Un cliente consulta el pedido de otro cliente (IDOR)',
    idor.status === 200,
    `John crea el pedido ${order.json._id}\nGET /api/orders/${order.json._id} con la cookie de Jane -> HTTP ${idor.status}\nDatos expuestos: ${short({ user: idor.json.user, shippingAddress: idor.json.shippingAddress })}`);

  // SEC-02 Carga de archivos sin autenticación (A01)
  const fd = new FormData();
  fd.append('image', new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' }), 'sec-02-anonimo.jpg');
  const up = await call('POST', '/upload', { form: fd });
  check('SEC-02', 'A01:2021 Broken Access Control', 'Carga de archivos al servidor sin autenticación',
    up.status === 200,
    `POST /api/upload sin cookie -> HTTP ${up.status}\nRespuesta: ${short(up.json)}`);

  // SEC-03 Lógica de negocio: cantidades negativas (A04)
  const neg = await call('POST', '/orders', {
    cookie: john,
    body: { orderItems: [{ _id: pid, name: 'x', image: '/x.jpg', price: 1, qty: -5 }], shippingAddress: shipping, paymentMethod: 'PayPal' },
  });
  check('SEC-03', 'A04:2021 Insecure Design', 'Pedido con cantidad negativa produce un total negativo',
    neg.status === 201 && Number(neg.json.totalPrice) < 0,
    `POST /api/orders qty=-5 -> HTTP ${neg.status}\nitemsPrice=${neg.json.itemsPrice} taxPrice=${neg.json.taxPrice} totalPrice=${neg.json.totalPrice}`);

  // SEC-04 Inyección en expresión regular (A03)
  const rx = await call('GET', '/products?keyword=' + encodeURIComponent('('));
  const rxAll = await call('GET', '/products?keyword=' + encodeURIComponent('.*'));
  check('SEC-04', 'A03:2021 Injection', 'El parámetro keyword se interpreta como expresión regular sin escapar',
    rx.status === 500 || rxAll.json.products?.length === products.length,
    `GET /api/products?keyword=(  -> HTTP ${rx.status} ${short(rx.json.message)}\nGET /api/products?keyword=.* -> HTTP ${rxAll.status}, ${rxAll.json.products?.length} productos (el patrón ".*" coincide con todo)`);

  // SEC-05 Inyección de operadores NoSQL en login (A03)
  const nosql = await call('POST', '/users/auth', { body: { email: { $ne: null }, password: '123456' } });
  const enumr = await call('POST', '/users/auth', { body: { email: { $regex: '^jane' }, password: '123456' } });
  check('SEC-05', 'A03:2021 Injection', 'Inyección de operadores NoSQL ($ne / $regex) en el inicio de sesión',
    nosql.status === 200,
    `POST /api/users/auth {"email":{"$ne":null},"password":"123456"} -> HTTP ${nosql.status}\nRespuesta: ${short(nosql.json)}\nPOST /api/users/auth {"email":{"$regex":"^jane"},"password":"123456"} -> HTTP ${enumr.status} ${short(enumr.json.email)}\nImpacto: se inicia sesión como el PRIMER usuario de la colección (el administrador) sin conocer su email; con $regex se enumeran cuentas carácter a carácter.`);

  // SEC-06 Fuerza bruta sin limitación (A07)
  const statuses = [];
  for (let i = 0; i < 30; i++) statuses.push((await call('POST', '/users/auth', { body: { email: 'john@email.com', password: `bad${i}` } })).status);
  const final = await call('POST', '/users/auth', { body: { email: 'john@email.com', password: '123456' } });
  check('SEC-06', 'A07:2021 Identification and Authentication Failures', 'Sin límite de intentos de inicio de sesión (fuerza bruta)',
    !statuses.includes(429) && final.status === 200,
    `30 intentos fallidos consecutivos -> códigos: ${[...new Set(statuses)].join(', ')} (ningún 429 ni bloqueo)\nIntento 31 con la contraseña correcta -> HTTP ${final.status}`);

  // SEC-07 Política de contraseñas débil (A07)
  const weak = await call('POST', '/users', { body: { name: 'Débil', email: `weak.${Date.now()}@test.co`, password: '1' } });
  check('SEC-07', 'A07:2021 Identification and Authentication Failures', 'Se permiten contraseñas de 1 carácter',
    weak.status === 201,
    `POST /api/users password="1" -> HTTP ${weak.status} ${short(weak.json)}`);

  // SEC-08 El token sigue siendo válido después del logout (A07)
  const tmp = await login('jane@email.com');
  await call('POST', '/users/logout', { cookie: tmp });
  const after = await call('GET', '/users/profile', { cookie: tmp });
  check('SEC-08', 'A07:2021 Identification and Authentication Failures', 'El JWT no se invalida en el servidor al cerrar sesión (validez 30 días)',
    after.status === 200,
    `POST /api/users/logout y luego GET /api/users/profile con el mismo token -> HTTP ${after.status}`);

  // SEC-09 Divulgación de información en errores (A05)
  const err = await call('GET', '/orders/abc', { cookie: john });
  check('SEC-09', 'A05:2021 Security Misconfiguration', 'Los errores 500 exponen el stack trace y rutas internas del servidor',
    err.status === 500 && !!err.json.stack,
    `GET /api/orders/abc -> HTTP ${err.status}\nstack: ${String(err.json.stack).split('\n').slice(0, 3).join(' | ')}`);

  // SEC-10 Cabeceras de seguridad (A05)
  const h = (await call('GET', '/products')).headers;
  const want = ['x-content-type-options', 'content-security-policy', 'x-frame-options', 'strict-transport-security'];
  const missing = want.filter((k) => !h.get(k));
  check('SEC-10', 'A05:2021 Security Misconfiguration', 'Faltan cabeceras de seguridad y se expone X-Powered-By',
    missing.length > 0 || !!h.get('x-powered-by'),
    `X-Powered-By: ${h.get('x-powered-by')}\nCabeceras ausentes: ${missing.join(', ')}`);

  // SEC-11 Escalamiento de privilegios vía registro/perfil (A01) - control esperado
  const esc = await call('PUT', '/users/profile', { cookie: john, body: { isAdmin: true } });
  const prof = await call('GET', '/users/profile', { cookie: john });
  check('SEC-11', 'A01:2021 Broken Access Control', 'Un cliente intenta auto-asignarse isAdmin en su perfil',
    prof.json.isAdmin === true,
    `PUT /api/users/profile {"isAdmin":true} -> HTTP ${esc.status}\nGET /api/users/profile -> isAdmin=${prof.json.isAdmin}`);

  // SEC-12 Manipulación del precio desde el cliente (A04) - control esperado
  const price = await call('POST', '/orders', {
    cookie: john,
    body: { orderItems: [{ _id: pid, name: 'x', image: '/x.jpg', price: 0.01, qty: 1 }], shippingAddress: shipping, paymentMethod: 'PayPal' },
  });
  check('SEC-12', 'A04:2021 Insecure Design', 'El cliente envía un precio manipulado (0.01)',
    price.json.orderItems?.[0]?.price === 0.01,
    `POST /api/orders price=0.01 -> HTTP ${price.status}, precio registrado=${price.json.orderItems?.[0]?.price} (precio real ${products[0].price})`);

  // SEC-13 Contraseña nunca expuesta (A02) - control esperado
  const adminCookie = await login('admin@email.com');
  const users = await call('GET', '/users', { cookie: adminCookie });
  const hasHash = JSON.stringify(users.json).includes('$2a$') || JSON.stringify(users.json).includes('"password"');
  check('SEC-13', 'A02:2021 Cryptographic Failures', 'El listado de usuarios (admin) expone el hash de las contraseñas',
    hasHash,
    `GET /api/users (admin) -> HTTP ${users.status}\n¿Incluye campo password / hash bcrypt?: ${hasHash}\nMuestra: ${short(users.json[0])}`);

  // Resumen
  const vuln = results.filter((r) => r.vulnerable);
  log.splice(4, 0,
    `## Resumen`, '',
    `| ID | OWASP | Verificación | Resultado |`, `|---|---|---|---|`,
    ...results.map((r) => `| ${r.id} | ${r.owasp.split(' ')[0]} | ${r.title} | ${r.vulnerable ? '❌ Vulnerable' : '✅ OK'} |`),
    '', `**${vuln.length} de ${results.length} verificaciones evidencian una vulnerabilidad.**`, '', '## Detalle', '');
  fs.writeFileSync(path.join(OUT, OUT_FILE), log.join('\n'));
  results.forEach((r) => console.log(`${r.vulnerable ? 'VULNERABLE' : 'OK        '} ${r.id} ${r.owasp.split(' ')[0]} ${r.title}`));
  console.log(`\n${vuln.length}/${results.length} vulnerables -> ${path.join(OUT, OUT_FILE)}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
