// Camada CONTROLLER (MVC — frontend).
// Reage às interações do usuário (filtros/seletores), busca os dados no
// MODEL (ApiModel) e manda a VIEW (ChartView) renderizar. Mantém o
// estado atual dos filtros. É o intermediário entre View e Model.
import { ApiModel } from '../models/ApiModel.js';
import { ChartView } from '../views/ChartView.js';

export class DashboardController {
  constructor() {
    // Estado dos filtros da interface
    this.estado = {
      totalModalidade: 'todos',
      iesPresencialGrupo: 'todas',
      iesEadGrupo: 'todas',
      cursoSelecionado: '',
      linhaModalidade: 'todos',
    };
  }

  // ---- Ação: total de matriculados por ano ----
  async carregarTotalPorAno() {
    const dados = await ApiModel.totalPorAno(this.estado.totalModalidade);
    if (!dados.length) return ChartView.vazio('chartTotalAno');
    ChartView.linha(
      'chartTotalAno',
      dados.map((d) => d.ano),
      dados.map((d) => d.total),
      `Matriculados (${this.#rotuloModalidade(this.estado.totalModalidade)})`,
    );
  }

  // ---- Ação: ranking de cursos (Presencial e EaD) em 2023 ----
  async carregarRankingCursos() {
    const [pres, ead] = await Promise.all([
      ApiModel.rankingCursos('Presencial'),
      ApiModel.rankingCursos('EaD'),
    ]);
    this.#renderRanking('chartCursosPresencial', pres, (d) => d.nome, 'Matrículas Presencial 2023');
    this.#renderRanking('chartCursosEad', ead, (d) => d.nome, 'Matrículas EaD 2023');
  }

  // ---- Ação: ranking de IES Presencial (com filtro de grupo) ----
  async carregarRankingIesPresencial() {
    const dados = await ApiModel.rankingIes('Presencial', this.estado.iesPresencialGrupo);
    this.#renderRanking('chartIesPresencial', dados, (d) => d.sigla || d.ies, 'IES Presencial 2023');
  }

  // ---- Ação: ranking de IES EaD (com filtro de grupo) ----
  async carregarRankingIesEad() {
    const dados = await ApiModel.rankingIes('EaD', this.estado.iesEadGrupo);
    this.#renderRanking('chartIesEad', dados, (d) => d.sigla || d.ies, 'IES EaD 2023');
  }

  // ---- Ação: popular seletor de cursos ----
  async carregarListaCursos() {
    return ApiModel.listarCursos();
  }

  // ---- Ação: linha do tempo de um curso ----
  async carregarLinhaDoTempo() {
    if (!this.estado.cursoSelecionado) return ChartView.vazio('chartLinhaTempo', 'Selecione um curso');
    const dados = await ApiModel.linhaDoTempo(this.estado.cursoSelecionado, this.estado.linhaModalidade);
    if (!dados.length) return ChartView.vazio('chartLinhaTempo', 'Sem dados para este curso/filtro');
    ChartView.linha(
      'chartLinhaTempo',
      dados.map((d) => d.ano),
      dados.map((d) => d.total),
      `${this.estado.cursoSelecionado} (${this.#rotuloModalidade(this.estado.linhaModalidade)})`,
    );
  }

  // ---- Helpers privados ----
  #renderRanking(canvasId, dados, labelFn, titulo) {
    if (!dados.length) return ChartView.vazio(canvasId);
    ChartView.barrasHorizontais(canvasId, dados.map(labelFn), dados.map((d) => d.total), titulo);
  }

  #rotuloModalidade(m) {
    return { todos: 'Todos', EaD: 'EaD', Presencial: 'Presencial' }[m] || m;
  }
}
