// =====================================================================
// ETL — Importa o CSV "Matriculados Região Sul.csv" para o PostgreSQL.
//
// Lê o arquivo em streaming (linha a linha) e faz inserções em lote:
//   1) insere um lote de cursos com RETURNING id (a ordem é preservada);
//   2) monta as linhas ano/quantidade usando os ids retornados;
//   3) insere as quantidades em matriculas_anuais em blocos.
// Células de ano vazias são ignoradas.
// =====================================================================
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute } from 'path';
import dotenv from 'dotenv';
import pool from '../src/config/database.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const csvRel = process.env.CSV_PATH || '../Matriculados Região Sul.csv';
const CSV_PATH = isAbsolute(csvRel) ? csvRel : join(__dirname, '..', csvRel);

const LOTE_CURSOS = 500; // cursos por INSERT
const NUM_COLS_DIM = 10;  // 10 primeiras colunas são dimensões

function grupoCategoria(cat) {
  return (cat || '').trim().toLowerCase().startsWith('públic') ? 'Pública' : 'Privada';
}

// Insere um lote de cursos e suas matrículas anuais dentro de uma transação.
async function inserirLote(client, lote, anos) {
  if (lote.length === 0) return 0;

  // --- 1) INSERT dos cursos (11 colunas) com RETURNING id ---
  const colsCurso = 11;
  const values = [];
  const placeholders = lote.map((c, i) => {
    const b = i * colsCurso;
    values.push(
      c.estado, c.cidade, c.ies, c.sigla, c.organizacao,
      c.categoriaAdministrativa, c.categoriaGrupo, c.nomeCurso,
      c.nomeDetalhado, c.grau, c.modalidade,
    );
    return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11})`;
  });

  const sqlCurso = `
    INSERT INTO cursos
      (estado, cidade, ies, sigla, organizacao, categoria_administrativa,
       categoria_grupo, nome_curso, nome_detalhado, grau, modalidade)
    VALUES ${placeholders.join(',')}
    RETURNING id;`;
  const { rows } = await client.query(sqlCurso, values);

  // --- 2) monta as linhas de matriculas_anuais usando os ids retornados ---
  const anosRows = [];
  lote.forEach((c, i) => {
    const cursoId = rows[i].id;
    c.matriculas.forEach(({ ano, quantidade }) => {
      if (Number.isNaN(ano) || Number.isNaN(quantidade) || cursoId == null) {
        console.error('[DEBUG] valor inválido:', { cursoId, ano, quantidade, curso: c.nomeCurso, ies: c.ies, matriculas: c.matriculas });
        throw new Error('valor NaN detectado');
      }
      anosRows.push([cursoId, ano, quantidade]);
    });
  });

  // --- 3) INSERT em blocos (máx. ~1000 linhas => 3000 parâmetros) ---
  const BLOCO = 1000;
  for (let i = 0; i < anosRows.length; i += BLOCO) {
    const bloco = anosRows.slice(i, i + BLOCO);
    const vals = [];
    const ph = bloco.map((r, j) => {
      const b = j * 3;
      vals.push(r[0], r[1], r[2]);
      return `($${b + 1},$${b + 2},$${b + 3})`;
    });
    await client.query(
      `INSERT INTO matriculas_anuais (curso_id, ano, quantidade) VALUES ${ph.join(',')};`,
      vals,
    );
  }
  return anosRows.length;
}

async function main() {
  console.log(`Lendo CSV: ${CSV_PATH}`);
  const rl = createInterface({
    input: createReadStream(CSV_PATH, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let anos = [];
  let lote = [];
  let totalCursos = 0;
  let totalAnos = 0;
  let ignoradas = 0;
  let primeira = true;

  const client = await pool.connect();

  for await (const linha of rl) {
    if (!linha.trim()) continue;
    const campos = linha.split(';');

    if (primeira) {
      // Cabeçalho: colunas 10+ são os anos (2009..2023)
      anos = campos.slice(NUM_COLS_DIM).map((a) => parseInt(a.trim(), 10));
      primeira = false;
      continue;
    }

    if (campos.length < NUM_COLS_DIM) { ignoradas++; continue; }

    const matriculas = [];
    for (let k = 0; k < anos.length; k++) {
      const raw = (campos[NUM_COLS_DIM + k] || '').trim();
      if (raw === '') continue;                 // célula vazia = não ofertado
      const q = parseInt(raw, 10);
      if (Number.isNaN(q)) continue;
      matriculas.push({ ano: anos[k], quantidade: q });
    }

    lote.push({
      estado: campos[0]?.trim(),
      cidade: campos[1]?.trim(),
      ies: campos[2]?.trim(),
      sigla: campos[3]?.trim(),
      organizacao: campos[4]?.trim(),
      categoriaAdministrativa: campos[5]?.trim(),
      categoriaGrupo: grupoCategoria(campos[5]),
      nomeCurso: campos[6]?.trim(),
      nomeDetalhado: campos[7]?.trim(),
      grau: campos[8]?.trim(),
      modalidade: campos[9]?.trim(),
      matriculas,
    });

    if (lote.length >= LOTE_CURSOS) {
      await client.query('BEGIN');
      totalAnos += await inserirLote(client, lote, anos);
      await client.query('COMMIT');
      totalCursos += lote.length;
      lote = [];
      if (totalCursos % 10000 === 0) {
        console.log(`  ... ${totalCursos} cursos importados (${totalAnos} registros anuais)`);
      }
    }
  }

  // Último lote
  if (lote.length) {
    await client.query('BEGIN');
    totalAnos += await inserirLote(client, lote, anos);
    await client.query('COMMIT');
    totalCursos += lote.length;
  }

  client.release();
  await pool.end();

  console.log('\nImportação concluída!');
  console.log(`  Cursos:            ${totalCursos}`);
  console.log(`  Registros anuais:  ${totalAnos}`);
  console.log(`  Linhas ignoradas:  ${ignoradas}`);
}

main().catch(async (err) => {
  console.error('\nFalha na importação:', err.message);
  try { await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
