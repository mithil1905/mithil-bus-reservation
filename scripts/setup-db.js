const { getPool } = require('../db');

async function setupDatabase() {
  const pool = await getPool();
  await pool.end();
}

setupDatabase().catch((error) => {
  console.error('Failed to initialize the MySQL database:', error);
  process.exitCode = 1;
});
