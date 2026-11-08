// Pruebas unitarias de middlewares: checkObjectId, admin, notFound y errorHandler.
import { jest } from '@jest/globals';
import checkObjectId from '../../app/backend/middleware/checkObjectId.js';
import { admin } from '../../app/backend/middleware/authMiddleware.js';
import { notFound, errorHandler } from '../../app/backend/middleware/errorMiddleware.js';

const mockRes = () => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn(() => res);
  return res;
};

describe('checkObjectId (PE: id válido / id inválido)', () => {
  test('id con formato ObjectId válido -> llama a next()', () => {
    const next = jest.fn();
    checkObjectId({ params: { id: '6560f1f1f1f1f1f1f1f1f1f1' } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test.each(['abc', '123', '6560f1f1f1f1f1f1f1f1f1f'])(
    'id inválido "%s" -> 404 y error',
    (id) => {
      const res = mockRes();
      const next = jest.fn();
      expect(() => checkObjectId({ params: { id } }, res, next)).toThrow(/Invalid ObjectId/);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).not.toHaveBeenCalled();
    }
  );
});

describe('admin (tabla de decisión: usuario autenticado x isAdmin)', () => {
  test('usuario admin -> next()', () => {
    const next = jest.fn();
    admin({ user: { isAdmin: true } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('usuario no admin -> 401', () => {
    const res = mockRes();
    expect(() => admin({ user: { isAdmin: false } }, res, jest.fn())).toThrow(/admin/);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('sin usuario -> 401', () => {
    const res = mockRes();
    expect(() => admin({}, res, jest.fn())).toThrow(/admin/);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('errorMiddleware', () => {
  test('notFound responde 404 con la ruta solicitada', () => {
    const res = mockRes();
    const next = jest.fn();
    notFound({ originalUrl: '/api/nope' }, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next.mock.calls[0][0].message).toBe('Not Found - /api/nope');
  });

  test('errorHandler convierte un status 200 en 500', () => {
    const res = mockRes();
    errorHandler(new Error('boom'), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].message).toBe('boom');
  });

  test('errorHandler conserva el status previo (ej. 401)', () => {
    const res = mockRes();
    res.statusCode = 401;
    errorHandler(new Error('x'), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('en producción no expone el stack trace', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    errorHandler(new Error('x'), {}, res, jest.fn());
    expect(res.json.mock.calls[0][0].stack).toBeNull();
    process.env.NODE_ENV = prev;
  });
});
