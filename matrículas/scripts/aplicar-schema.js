// Aplica o schema.sql no banco configurado em DATABASE_URL.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../src/config/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = readFileSync(join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  console.log('Aplicando schema...');
  await pool.query(sql);
  console.log('Schema aplicado com sucesso (tabelas cursos e matriculas_anuais criadas).');
  await pool.end();
}

main().catch((err) => {
  console.error('Falha ao aplicar schema:', err.message);
  process.exit(1);
});
