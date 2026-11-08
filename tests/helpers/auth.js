// Utilidades de autenticación: obtiene la cookie JWT de un usuario para enviarla
// manualmente (la cookie es "Secure" fuera de development y superagent no la reenvía por http).
import request from 'supertest';
import app from '../../app/backend/app.js';

export async function loginCookie(email, password = '123456') {
  const res = await request(app).post('/api/users/auth').send({ email, password });
  if (res.status !== 200) throw new Error(`Login fallido para ${email}: ${res.status}`);
  return res.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
}

export const SHIPPING = {
  address: 'Calle 73 # 76A-354',
  city: 'Medellín',
  postalCode: '050034',
  country: 'Colombia',
};
