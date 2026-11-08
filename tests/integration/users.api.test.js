// Pruebas de integración de la API de usuarios (/api/users)
// Requisitos: RF01 autenticación, RF02 registro, RF03 perfil.
// Convención: test.failing('[DEF-xx] ...') documenta un defecto CONFIRMADO: la prueba
// expresa el comportamiento esperado y hoy falla. Cuando el defecto se corrija Jest
// avisará y la prueba debe pasar a test() normal (prueba de regresión).
import request from 'supertest';
import app from '../../app/backend/app.js';
import * as db from '../helpers/db.js';
import { loginCookie } from '../helpers/auth.js';

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(db.seed);

describe('RF01 - Autenticación POST /api/users/auth', () => {
  test('credenciales válidas -> 200, datos del usuario y cookie jwt HttpOnly', async () => {
    const res = await request(app)
      .post('/api/users/auth')
      .send({ email: 'john@email.com', password: '123456' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'John Doe', email: 'john@email.com', isAdmin: false });
    expect(res.body.password).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/^jwt=.+HttpOnly/);
  });

  test.each([
    ['contraseña incorrecta', { email: 'john@email.com', password: '654321' }],
    ['email no registrado', { email: 'nadie@email.com', password: '123456' }],
    ['cuerpo vacío', {}],
  ])('PE inválida: %s -> 401', async (_d, body) => {
    const res = await request(app).post('/api/users/auth').send(body);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });
});

describe('Seguridad de la autenticación (OWASP A03 / A02)', () => {
  test.failing('[DEF-15] inyección NoSQL: {"email":{"$ne":null}} NO debe autenticar a ningún usuario', async () => {
    const res = await request(app)
      .post('/api/users/auth')
      .send({ email: { $ne: null }, password: '123456' });
    expect(res.status).toBe(401);
  });

  test.failing('[DEF-16] el listado de usuarios (admin) no debe incluir el hash de la contraseña', async () => {
    const cookie = await loginCookie('admin@email.com');
    const res = await request(app).get('/api/users').set('Cookie', cookie);
    expect(res.status).toBe(200);
    res.body.forEach((u) => expect(u.password).toBeUndefined());
  });
});

describe('RF02 - Registro POST /api/users', () => {
  const nuevo = { name: 'Ana QA', email: 'ana@qa.com', password: '123456' };

  test('datos válidos -> 201 y sesión iniciada', async () => {
    const res = await request(app).post('/api/users').send(nuevo);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Ana QA', email: 'ana@qa.com', isAdmin: false });
    expect(res.headers['set-cookie'][0]).toMatch(/^jwt=/);
  });

  test('email ya registrado -> 400', async () => {
    const res = await request(app).post('/api/users').send({ ...nuevo, email: 'john@email.com' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('User already exists');
  });

  test('VL: contraseña de 6 caracteres (mínimo) es aceptada', async () => {
    const res = await request(app).post('/api/users').send({ ...nuevo, password: 'abcdef' });
    expect(res.status).toBe(201);
  });

  test.failing('[DEF-07] VL: contraseña de 5 caracteres (mínimo-1) debe rechazarse con 400', async () => {
    const res = await request(app).post('/api/users').send({ ...nuevo, password: 'abcde' });
    expect(res.status).toBe(400);
  });

  test.failing('[DEF-07] PE inválida: email sin formato válido debe rechazarse con 400', async () => {
    const res = await request(app).post('/api/users').send({ ...nuevo, email: 'noesunemail' });
    expect(res.status).toBe(400);
  });

  test.failing('[DEF-08] email duplicado con distinta capitalización debe rechazarse', async () => {
    const res = await request(app).post('/api/users').send({ ...nuevo, email: 'JOHN@email.com' });
    expect(res.status).toBe(400);
  });

  test.failing('[DEF-09] nombre vacío debe responder 400 (hoy responde 500)', async () => {
    const res = await request(app).post('/api/users').send({ ...nuevo, name: '' });
    expect(res.status).toBe(400);
  });
});

describe('RF03 - Perfil /api/users/profile', () => {
  test('sin token -> 401', async () => {
    const res = await request(app).get('/api/users/profile');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Not authorized, no token');
  });

  test('token manipulado -> 401', async () => {
    const res = await request(app).get('/api/users/profile').set('Cookie', 'jwt=abc.def.ghi');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Not authorized, token failed');
  });

  test('con sesión -> 200 y no expone el hash de la contraseña', async () => {
    const cookie = await loginCookie('jane@email.com');
    const res = await request(app).get('/api/users/profile').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ email: 'jane@email.com' }));
    expect(res.body.password).toBeUndefined();
  });

  test('actualizar sólo el nombre conserva la contraseña', async () => {
    const cookie = await loginCookie('jane@email.com');
    const upd = await request(app)
      .put('/api/users/profile')
      .set('Cookie', cookie)
      .send({ name: 'Jane Actualizada' });
    expect(upd.status).toBe(200);
    expect(upd.body.name).toBe('Jane Actualizada');
    await expect(loginCookie('jane@email.com', '123456')).resolves.toMatch(/jwt=/);
  });

  test.failing('[DEF-09] cambiar el email a uno existente debe responder 400 (hoy 500)', async () => {
    const cookie = await loginCookie('jane@email.com');
    const res = await request(app)
      .put('/api/users/profile')
      .set('Cookie', cookie)
      .send({ email: 'john@email.com' });
    expect(res.status).toBe(400);
  });
});

describe('Administración de usuarios', () => {
  test('cliente no admin no puede listar usuarios -> 401', async () => {
    const cookie = await loginCookie('john@email.com');
    const res = await request(app).get('/api/users').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  test('admin lista los 3 usuarios semilla', async () => {
    const cookie = await loginCookie('admin@email.com');
    const res = await request(app).get('/api/users').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  test('no se puede eliminar un usuario administrador -> 400', async () => {
    const cookie = await loginCookie('admin@email.com');
    const list = await request(app).get('/api/users').set('Cookie', cookie);
    const adminId = list.body.find((u) => u.isAdmin)._id;
    const res = await request(app).delete(`/api/users/${adminId}`).set('Cookie', cookie);
    expect(res.status).toBe(400);
  });
});
