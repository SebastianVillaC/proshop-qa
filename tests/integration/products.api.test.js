// Pruebas de integración de la API de productos (/api/products)
// Requisitos: RF04 catálogo/búsqueda/paginación, RF05 reseñas, RF08 administración de productos.
import request from 'supertest';
import app from '../../app/backend/app.js';
import * as db from '../helpers/db.js';
import { loginCookie } from '../helpers/auth.js';

let seed;
beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(async () => {
  seed = await db.seed();
});

describe('RF04 - Catálogo, búsqueda y paginación', () => {
  test('lista los 6 productos semilla en 1 página', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(6);
    expect(res.body).toMatchObject({ page: 1, pages: 1 });
  });

  test.each([
    ['coincidencia parcial (iPhone y Headphones)', 'phone', 2],
    ['insensible a mayúsculas', 'CANNON', 1],
    ['sin coincidencias', 'zzzz', 0],
  ])('búsqueda PE %s ("%s") -> %i resultados', async (_d, keyword, n) => {
    const res = await request(app).get('/api/products').query({ keyword });
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(n);
  });

  test.each([
    ['0 (no válido, se normaliza a 1)', '0', 1, 6],
    ['1 (primera página)', '1', 1, 6],
    ['2 (más allá de la última)', '2', 2, 0],
  ])('VL pageNumber=%s', async (_d, pageNumber, page, n) => {
    const res = await request(app).get('/api/products').query({ pageNumber });
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(page);
    expect(res.body.products).toHaveLength(n);
  });

  test.failing('[DEF-09] VL pageNumber=-1 debe responder 200/400, no 500', async () => {
    const res = await request(app).get('/api/products').query({ pageNumber: '-1' });
    expect(res.status).toBeLessThan(500);
  });

  test.failing('[DEF-10] keyword con metacaracteres de regex "(" no debe producir 500', async () => {
    const res = await request(app).get('/api/products').query({ keyword: '(' });
    expect(res.status).toBe(200);
  });

  test('top devuelve 3 productos ordenados por rating descendente', async () => {
    const res = await request(app).get('/api/products/top');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    const ratings = res.body.map((p) => p.rating);
    expect([...ratings].sort((a, b) => b - a)).toEqual(ratings);
  });

  test('detalle de producto existente -> 200', async () => {
    const id = seed.products[0]._id.toString();
    const res = await request(app).get(`/api/products/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(seed.products[0].name);
  });

  test.each([
    ['ObjectId mal formado', 'abc'],
    ['ObjectId válido inexistente', '6560f1f1f1f1f1f1f1f1f1f1'],
  ])('detalle con %s -> 404', async (_d, id) => {
    const res = await request(app).get(`/api/products/${id}`);
    expect(res.status).toBe(404);
  });
});

describe('RF05 - Reseñas POST /api/products/:id/reviews', () => {
  const url = () => `/api/products/${seed.products[0]._id}/reviews`;

  test('sin sesión -> 401', async () => {
    const res = await request(app).post(url()).send({ rating: 5, comment: 'ok' });
    expect(res.status).toBe(401);
  });

  test.each([1, 5])('VL rating=%i (límites válidos) -> 201 y recalcula promedio', async (rating) => {
    const cookie = await loginCookie('john@email.com');
    const res = await request(app).post(url()).set('Cookie', cookie).send({ rating, comment: 'QA' });
    expect(res.status).toBe(201);
    const prod = await request(app).get(`/api/products/${seed.products[0]._id}`);
    expect(prod.body.numReviews).toBe(1);
    expect(prod.body.rating).toBe(rating);
  });

  test('un usuario no puede reseñar dos veces el mismo producto -> 400', async () => {
    const cookie = await loginCookie('john@email.com');
    await request(app).post(url()).set('Cookie', cookie).send({ rating: 4, comment: 'a' });
    const res = await request(app).post(url()).set('Cookie', cookie).send({ rating: 3, comment: 'b' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Product already reviewed');
  });

  test.failing('[DEF-05] VL rating=0 (mínimo-1) debe rechazarse con 400', async () => {
    const cookie = await loginCookie('john@email.com');
    const res = await request(app).post(url()).set('Cookie', cookie).send({ rating: 0, comment: 'x' });
    expect(res.status).toBe(400);
  });

  test.failing('[DEF-05] VL rating=6 (máximo+1) debe rechazarse con 400', async () => {
    const cookie = await loginCookie('john@email.com');
    const res = await request(app).post(url()).set('Cookie', cookie).send({ rating: 6, comment: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('RF08 - Administración de productos', () => {
  test('cliente no admin no puede crear productos -> 401', async () => {
    const cookie = await loginCookie('john@email.com');
    const res = await request(app).post('/api/products').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  test('admin crea producto de ejemplo y luego lo edita', async () => {
    const cookie = await loginCookie('admin@email.com');
    const created = await request(app).post('/api/products').set('Cookie', cookie);
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Sample name');

    const upd = await request(app)
      .put(`/api/products/${created.body._id}`)
      .set('Cookie', cookie)
      .send({
        name: 'Teclado QA', price: 120.5, description: 'Mecánico', image: '/images/sample.jpg',
        brand: 'ITM', category: 'Electronics', countInStock: 4,
      });
    expect(upd.status).toBe(200);
    expect(upd.body).toMatchObject({ name: 'Teclado QA', price: 120.5, countInStock: 4 });
  });

  test('admin elimina un producto -> 200 y deja de existir', async () => {
    const cookie = await loginCookie('admin@email.com');
    const id = seed.products[5]._id;
    const del = await request(app).delete(`/api/products/${id}`).set('Cookie', cookie);
    expect(del.status).toBe(200);
    expect((await request(app).get(`/api/products/${id}`)).status).toBe(404);
  });

  test.failing('[DEF-06] VL precio negativo (-0.01) debe rechazarse con 400', async () => {
    const cookie = await loginCookie('admin@email.com');
    const res = await request(app)
      .put(`/api/products/${seed.products[0]._id}`)
      .set('Cookie', cookie)
      .send({ ...seed.products[0].toObject(), price: -0.01 });
    expect(res.status).toBe(400);
  });

  test.failing('[DEF-06] VL stock negativo (-1) debe rechazarse con 400', async () => {
    const cookie = await loginCookie('admin@email.com');
    const res = await request(app)
      .put(`/api/products/${seed.products[0]._id}`)
      .set('Cookie', cookie)
      .send({ ...seed.products[0].toObject(), countInStock: -1 });
    expect(res.status).toBe(400);
  });
});
