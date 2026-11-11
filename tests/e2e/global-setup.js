// Restaura los datos semilla (usuarios y productos) antes de ejecutar la suite E2E,
// para que cada ejecución parta de un estado conocido y reproducible.
const { execSync } = require('child_process');
const path = require('path');

module.exports = async () => {
  if (process.env.SKIP_SEED) return;
  execSync('node backend/seeder.js', {
    cwd: path.resolve(__dirname, '../../app'),
    stdio: 'inherit',
  });
};
