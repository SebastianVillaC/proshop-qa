// Pruebas de integración de la API de órdenes (/api/orders)
// Requisitos: RF06 cálculo del pedido, RF07 consulta de pedidos (control de acceso).
import request from 'supertest';
import app from '../../app/backend/app.js';
import * as db from '../helpers/db.js';
import { loginCookie, SHIPPING } from '../helpers/auth.js';

let seed;
beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(async () => {
  seed = await db.seed();
});

const byName = (name) => seed.products.find((p) => p.name.includes(name));
const orderBody = (product, qty, clientPrice) => ({
  orderItems: [
    {
      _id: product._id.toString(),
      name: product.name,
      image: product.image,
      price: clientPrice ?? product.price,
      qty,
    },
  ],
  shippingAddress: SHIPPING,
  paymentMethod: 'PayPal',
});

async function crearOrden(email, body) {
  const cookie = await loginCookie(email);
  return request(app).post('/api/orders').set('Cookie', cookie).send(body);
}

describe('RF06 - Creación de pedido POST /api/orders', () => {
  test('sin sesión -> 401', async () => {
    const res = await request(app).post('/api/orders').send(orderBody(byName('Airpods'), 1));
    expect(res.status).toBe(401);
  });

  test('calcula totales en el servidor (Airpods 89.99 x1: envío 10, IVA 13.50)', async () => {
    const res = await crearOrden('john@email.com', orderBody(byName('Airpods'), 1));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      itemsPrice: 89.99, shippingPrice: 10, taxPrice: 13.5, totalPrice: 113.49, isPaid: false,
    });
  });

  test('ignora el precio enviado por el cliente (manipulación de precio)', async () => {
    const res = await crearOrden('john@email.com', orderBody(byName('Airpods'), 1, 0.01));
    expect(res.status).toBe(201);
    expect(res.body.orderItems[0].price).toBe(89.99);
  });

  test('VL subtotal > 100 (Mouse 49.99 x3 = 149.97) -> envío gratis', async () => {
    const res = await crearOrden('john@email.com', orderBody(byName('Mouse'), 3));
    expect(res.status).toBe(201);
    expect(res.body.shippingPrice).toBe(0);
  });

  test('lista de items vacía -> 400 "No order items"', async () => {
    const res = await crearOrden('john@email.com', { ...orderBody(byName('Airpods'), 1), orderItems: [] });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No order items');
  });

  test.failing('[DEF-09] cuerpo sin orderItems debe responder 400 (hoy 500)', async () => {
    const res = await crearOrden('john@email.com', {});
    expect(res.status).toBe(400);
  });

  test.failing('[DEF-01] VL cantidad 0 debe rechazarse con 400', async () => {
    const res = await crearOrden('john@email.com', orderBody(byName('Airpods'), 0));
    expect(res.status).toBe(400);
  });

  test.failing('[DEF-01] PE cantidad negativa (-5) debe rechazarse (hoy genera total negativo)', async () => {
    const res = await crearOrden('john@email.com', orderBody(byName('Airpods'), -5));
    expect(res.status).toBe(400);
  });

  test('VL cantidad = stock disponible (Airpods, 10) es aceptada', async () => {
    const p = byName('Airpods');
    const res = await crearOrden('john@email.com', orderBody(p, p.countInStock));
    expect(res.status).toBe(201);
  });

  test.failing('[DEF-04] VL cantidad = stock + 1 debe rechazarse con 400', async () => {
    const p = byName('Airpods');
    const res = await crearOrden('john@email.com', orderBody(p, p.countInStock + 1));
    expect(res.status).toBe(400);
  });
});

describe('RF07 - Consulta de pedidos y control de acceso', () => {
  test('/mine devuelve sólo los pedidos del usuario autenticado', async () => {
    await crearOrden('john@email.com', orderBody(byName('Airpods'), 1));
    await crearOrden('jane@email.com', orderBody(byName('Mouse'), 1));
    const cookie = await loginCookie('john@email.com');
    const res = await request(app).get('/api/orders/mine').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('el dueño puede ver su pedido -> 200', async () => {
    const order = await crearOrden('john@email.com', orderBody(byName('Airpods'), 1));
    const cookie = await loginCookie('john@email.com');
    const res = await request(app).get(`/api/orders/${order.body._id}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('john@email.com');
  });

  test('el administrador puede ver cualquier pedido -> 200', async () => {
    const order = await crearOrden('john@email.com', orderBody(byName('Airpods'), 1));
    const cookie = await loginCookie('admin@email.com');
    const res = await request(app).get(`/api/orders/${order.body._id}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  test.failing('[DEF-02] otro cliente NO debe poder ver el pedido ajeno (IDOR) -> 403/404', async () => {
    const order = await crearOrden('john@email.com', orderBody(byName('Airpods'), 1));
    const cookie = await loginCookie('jane@email.com');
    const res = await request(app).get(`/api/orders/${order.body._id}`).set('Cookie', cookie);
    expect([403, 404]).toContain(res.status);
  });

  test.failing('[DEF-09] id de pedido mal formado debe responder 404 (hoy 500)', async () => {
    const cookie = await loginCookie('john@email.com');
    const res = await request(app).get('/api/orders/abc').set('Cookie', cookie);
    expect(res.status).toBe(404);
  });

  test('cliente no admin no puede marcar como entregado -> 401', async () => {
    const order = await crearOrden('john@email.com', orderBody(byName('Airpods'), 1));
    const cookie = await loginCookie('john@email.com');
    const res = await request(app).put(`/api/orders/${order.body._id}/deliver`).set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  test('admin marca el pedido como entregado -> 200', async () => {
    const order = await crearOrden('john@email.com', orderBody(byName('Airpods'), 1));
    const cookie = await loginCookie('admin@email.com');
    const res = await request(app).put(`/api/orders/${order.body._id}/deliver`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.isDelivered).toBe(true);
  });
});
