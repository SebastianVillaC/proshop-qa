// Variables de entorno para el ambiente de pruebas (no usa el .env real).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'jwt-secret-solo-para-pruebas';
process.env.PAGINATION_LIMIT = '8';
