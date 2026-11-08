// Pruebas de integración de la carga de imágenes (/api/upload) - RF08.
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../../app/backend/app.js';

const UPLOADS = path.resolve('uploads');
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
let creados = [];

beforeAll(() => fs.mkdirSync(UPLOADS, { recursive: true }));
afterAll(() => creados.forEach((f) => fs.rmSync(path.resolve(f.replace(/^\//, '')), { force: true })));

describe('RF08 - Carga de imágenes de producto', () => {
  test.each([
    ['.txt con mimetype text/plain', 'nota.txt', 'text/plain'],
    ['.svg (no permitido)', 'logo.svg', 'image/svg+xml'],
    ['.jpg con mimetype falso text/html', 'foto.jpg', 'text/html'],
  ])('PE inválida: %s -> 400 "Images only!"', async (_d, filename, contentType) => {
    const res = await request(app).post('/api/upload').attach('image', JPG, { filename, contentType });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Images only!');
  });

  test.failing('[DEF-03] un usuario anónimo NO debe poder subir archivos -> 401', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('image', JPG, { filename: 'anonimo.jpg', contentType: 'image/jpeg' });
    if (res.body.image) creados.push(res.body.image);
    expect(res.status).toBe(401);
  });
});
