// Configuración de Jest para las pruebas unitarias y de integración del backend.
// Los módulos del backend (express, mongoose, ...) se resuelven desde app/node_modules
// para que pruebas y aplicación compartan la MISMA instancia de mongoose.
export default {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/unit/**/*.test.js', '<rootDir>/tests/integration/**/*.test.js'],
  modulePaths: ['<rootDir>/app/node_modules'],
  transform: {},
  setupFiles: ['<rootDir>/tests/helpers/env.js'],
  testTimeout: 60000,
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'app/backend/**/*.js',
    '!app/backend/data/**',
    '!app/backend/seeder.js',
    '!app/backend/server.js',
    '!app/backend/config/db.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'evidencias/jest', outputName: 'junit-backend.xml' }],
  ],
};
