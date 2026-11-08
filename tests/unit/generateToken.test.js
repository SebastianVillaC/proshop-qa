// Pruebas unitarias de backend/utils/generateToken.js
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import generateToken from '../../app/backend/utils/generateToken.js';

const fakeRes = () => ({ cookie: jest.fn() });

describe('generateToken', () => {
  test('firma un JWT con el userId y lo guarda en la cookie "jwt"', () => {
    const res = fakeRes();
    generateToken(res, 'user-123');

    expect(res.cookie).toHaveBeenCalledTimes(1);
    const [name, token] = res.cookie.mock.calls[0];
    expect(name).toBe('jwt');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.userId).toBe('user-123');
  });

  test('el token expira en 30 días', () => {
    const res = fakeRes();
    generateToken(res, 'u');
    const decoded = jwt.decode(res.cookie.mock.calls[0][1]);
    expect(decoded.exp - decoded.iat).toBe(30 * 24 * 60 * 60);
  });

  test('la cookie es HttpOnly, SameSite=strict y Secure fuera de development', () => {
    const res = fakeRes();
    generateToken(res, 'u');
    const options = res.cookie.mock.calls[0][2];
    expect(options).toMatchObject({ httpOnly: true, sameSite: 'strict', secure: true });
    expect(options.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
