// =====================================================================
// Repository Pattern
// ---------------------------------------------------------------------
// Toda a comunicação com o SGBD relacional (PostgreSQL) fica isolada
// aqui. As camadas superiores (Service/Controller) NÃO conhecem SQL:
// dependem apenas destes métodos. Isso desacopla o domínio da
// tecnologia de persistência.
// =====================================================================
import { query } from '../config/database.js';
import Curso from '../models/Curso.js';
import { TotalAnual, RankingCurso, RankingIes } from '../models/Resultados.js';

class MatriculaRepository {
  // Hidrata uma linha do SGBD no Model de domínio Curso (camada Model do MVC).
  #mapCurso(row) {
    return new Curso({
      estado: row.estado,
      cidade: row.cidade,
      ies: row.ies,
      sigla: row.sigla,
      organizacao: row.organizacao,
      categoriaAdministrativa: row.categoria_administrativa,
      nomeCurso: row.nome_curso,
      nomeDetalhado: row.nome_detalhado,
      grau: row.grau,
      modalidade: row.modalidade,
    });
  }

  // Traduz o filtro de modalidade recebido da API para cláusula SQL.
  // Retorna { clausula, params }.
  #filtroModalidade(modalidade, startIndex = 1) {
    if (modalidade && modalidade !== 'todos') {
      return { clausula: `AND c.modalidade = $${startIndex}`, params: [modalidade] };
    }
    return { clausula: '', params: [] };
  }

  // 1) Total de alunos matriculados por ano (filtro: todos / EaD / Presencial)
  async totalPorAno(modalidade = 'todos') {
    const { clausula, params } = this.#filtroModalidade(modalidade);
    const sql = `
      SELECT ma.ano, SUM(ma.quantidade)::bigint AS total
      FROM matriculas_anuais ma
      JOIN cursos c ON c.id = ma.curso_id
      WHERE 1 = 1 ${clausula}
      GROUP BY ma.ano
      ORDER BY ma.ano;`;
    const { rows } = await query(sql, params);
    return rows.map((r) => new TotalAnual(r.ano, Number(r.total)));
  }

  // 2/3) Ranking de cursos por modalidade em um ano (top N)
  async rankingCursos(modalidade, ano = 2023, limite = 10) {
    const sql = `
      SELECT c.nome_curso, SUM(ma.quantidade)::bigint AS total
      FROM matriculas_anuais ma
      JOIN cursos c ON c.id = ma.curso_id
      WHERE ma.ano = $1 AND c.modalidade = $2
      GROUP BY c.nome_curso
      ORDER BY total DESC
      LIMIT $3;`;
    const { rows } = await query(sql, [ano, modalidade, limite]);
    return rows.map((r) => new RankingCurso(r.nome_curso, Number(r.total)));
  }

  // 4/5) Ranking de IES por modalidade em um ano, com filtro público/privado
  async rankingIes(modalidade, grupo = 'todas', ano = 2023, limite = 10) {
    const params = [ano, modalidade];
    let filtroGrupo = '';
    if (grupo && grupo !== 'todas') {
      params.push(grupo);
      filtroGrupo = `AND c.categoria_grupo = $${params.length}`;
    }
    params.push(limite);
    const sql = `
      SELECT c.ies, MAX(c.sigla) AS sigla, SUM(ma.quantidade)::bigint AS total
      FROM matriculas_anuais ma
      JOIN cursos c ON c.id = ma.curso_id
      WHERE ma.ano = $1 AND c.modalidade = $2 ${filtroGrupo}
      GROUP BY c.ies
      ORDER BY total DESC
      LIMIT $${params.length};`;
    const { rows } = await query(sql, params);
    return rows.map((r) => new RankingIes(r.ies, r.sigla, Number(r.total)));
  }

  // 6) Linha do tempo de um curso: evolução ano a ano (filtro de modalidade)
  async linhaDoTempoCurso(nomeCurso, modalidade = 'todos') {
    const params = [nomeCurso];
    const { clausula } = this.#filtroModalidade(modalidade, 2);
    if (clausula) params.push(modalidade);
    const sql = `
      SELECT ma.ano, SUM(ma.quantidade)::bigint AS total
      FROM matriculas_anuais ma
      JOIN cursos c ON c.id = ma.curso_id
      WHERE c.nome_curso = $1 ${clausula}
      GROUP BY ma.ano
      ORDER BY ma.ano;`;
    const { rows } = await query(sql, params);
    return rows.map((r) => new TotalAnual(r.ano, Number(r.total)));
  }

  // Cursos distintos (um por nome) já hidratados como Model de domínio Curso.
  async listarCursos() {
    const sql = `
      SELECT DISTINCT ON (nome_curso)
             estado, cidade, ies, sigla, organizacao, categoria_administrativa,
             nome_curso, nome_detalhado, grau, modalidade
      FROM cursos
      ORDER BY nome_curso;`;
    const { rows } = await query(sql);
    return rows.map((r) => this.#mapCurso(r));
  }

  // Nomes de cursos distintos (para popular o seletor da linha do tempo),
  // derivados a partir das instâncias de Curso.
  async listarNomesCursos() {
    const cursos = await this.listarCursos();
    return cursos.map((c) => c.nomeCurso);
  }
}

export default new MatriculaRepository();
