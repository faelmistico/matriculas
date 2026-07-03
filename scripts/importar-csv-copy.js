// =====================================================================
// ETL rápido via COPY — carrega o CSV "Matriculados Região Sul.csv"
// para o PostgreSQL usando streaming server-side (COPY FROM STDIN),
// muito mais rápido que INSERTs linha a linha.
//
// Estratégia:
//   1) TRUNCATE cursos/matriculas (RESTART IDENTITY) => ids começam em 1;
//   2) cria staging UNLOGGED com as 25 colunas do CSV (id SERIAL 1..N);
//   3) COPY do CSV inteiro para a staging (segundos);
//   4) INSERT em cursos SELECT ... FROM staging ORDER BY id
//        => cursos.id fica igual a staging.id (mesma ordem de inserção);
//   5) explode as 15 colunas de ano em matriculas_anuais usando
//        curso_id = staging.id (sem join, sem coluna temporária, sem ALTER).
//
// Evita ALTER TABLE (lock AccessExclusive) que causava contenção de lock.
// =====================================================================
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';
import { pipeline } from 'stream/promises';
import dotenv from 'dotenv';
import { from as copyFrom } from 'pg-copy-streams';
import pool from '../src/config/database.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvRel = process.env.CSV_PATH || '../Matriculados Região Sul.csv';
const CSV_PATH = isAbsolute(csvRel) ? csvRel : join(__dirname, '..', csvRel);

const ANOS = [
  2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016,
  2017, 2018, 2019, 2020, 2021, 2022, 2023,
];

async function main() {
  const t0 = Date.now();
  const client = await pool.connect();
  try {
    // Supabase impõe timeouts curtos por padrão. As operações em lote
    // (INSERT de ~209k cursos + explosão de ~2M matrículas) passam disso.
    await client.query('SET statement_timeout = 0');
    // Segurança: se algo travar, a sessão não fica "idle in transaction"
    // segurando locks indefinidamente (evita conexões fantasmas no pooler).
    await client.query("SET idle_in_transaction_session_timeout = '120s'");

    console.log(`Lendo CSV: ${CSV_PATH}`);

    // --- 1) zera as tabelas de destino (ids voltam a começar em 1) ----
    await client.query('TRUNCATE matriculas_anuais, cursos RESTART IDENTITY');

    // --- 2) staging ---------------------------------------------------
    const colsAno = ANOS.map((a) => `y${a} INTEGER`).join(', ');
    await client.query('DROP TABLE IF EXISTS staging_csv');
    await client.query(`
      CREATE UNLOGGED TABLE staging_csv (
        id SERIAL PRIMARY KEY,
        estado TEXT, cidade TEXT, ies TEXT, sigla TEXT, organizacao TEXT,
        categoria_administrativa TEXT, nome_curso TEXT, nome_detalhado TEXT,
        grau TEXT, modalidade TEXT, ${colsAno}
      )`);

    // --- 3) COPY do CSV -> staging -----------------------------------
    console.log('Carregando CSV via COPY...');
    const colList = [
      'estado', 'cidade', 'ies', 'sigla', 'organizacao',
      'categoria_administrativa', 'nome_curso', 'nome_detalhado',
      'grau', 'modalidade', ...ANOS.map((a) => `y${a}`),
    ].join(', ');
    const copySql = `COPY staging_csv (${colList})
      FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ';', NULL '')`;
    await pipeline(
      createReadStream(CSV_PATH, { encoding: 'utf8' }),
      client.query(copyFrom(copySql)),
    );
    const { rows: [{ n: nStaging }] } = await client.query('SELECT count(*)::int n FROM staging_csv');
    console.log(`  ${nStaging} linhas carregadas na staging.`);

    // --- 4) cursos (ORDER BY id => cursos.id == staging.id) ----------
    await client.query('BEGIN');
    console.log('Inserindo cursos...');
    await client.query(`
      INSERT INTO cursos
        (estado, cidade, ies, sigla, organizacao, categoria_administrativa,
         categoria_grupo, nome_curso, nome_detalhado, grau, modalidade)
      SELECT estado, cidade, ies, sigla, organizacao, categoria_administrativa,
             CASE WHEN lower(btrim(categoria_administrativa)) LIKE 'públic%'
                  THEN 'Pública' ELSE 'Privada' END,
             nome_curso, nome_detalhado, grau, modalidade
      FROM staging_csv
      ORDER BY id`);

    // Sanidade: confirma que o mapeamento id->curso ficou alinhado.
    const { rows: [chk] } = await client.query(`
      SELECT count(*)::int divergentes
      FROM staging_csv s JOIN cursos c ON c.id = s.id
      WHERE c.nome_curso IS DISTINCT FROM s.nome_curso
         OR c.ies IS DISTINCT FROM s.ies`);
    if (chk.divergentes !== 0) {
      throw new Error(`mapeamento curso<->staging divergente em ${chk.divergentes} linhas`);
    }

    // --- 5) explode anos -> matriculas_anuais ------------------------
    console.log('Explodindo matrículas anuais...');
    const unpivot = ANOS.map((a) => `(${a}, s.y${a})`).join(', ');
    await client.query(`
      INSERT INTO matriculas_anuais (curso_id, ano, quantidade)
      SELECT s.id, v.ano, v.quantidade
      FROM staging_csv s
      CROSS JOIN LATERAL (VALUES ${unpivot}) AS v(ano, quantidade)
      WHERE v.quantidade IS NOT NULL`);

    await client.query('COMMIT');
    await client.query('DROP TABLE IF EXISTS staging_csv');

    const { rows: [tot] } = await client.query(
      'SELECT (SELECT count(*) FROM cursos)::int c, (SELECT count(*) FROM matriculas_anuais)::int m');
    console.log('\nImportação concluída!');
    console.log(`  Cursos:            ${tot.c}`);
    console.log(`  Registros anuais:  ${tot.m}`);
    console.log(`  Tempo:             ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\nFalha na importação:', err.message);
  process.exit(1);
});
