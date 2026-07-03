// Configuração central de acesso ao SGBD (PostgreSQL / Supabase).
// Um único Pool de conexões é compartilhado por toda a aplicação.
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('\n[ERRO] Variável DATABASE_URL não definida. Copie .env.example para .env e preencha a connection string do Supabase.\n');
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase exige SSL; rejectUnauthorized:false evita problemas com a cadeia de certificados.
  ssl: { rejectUnauthorized: false },
  max: 10,
});

pool.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool de conexões:', err.message);
});

export const query = (text, params) => pool.query(text, params);
export default pool;
