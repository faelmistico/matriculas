// Camada MODEL (MVC — frontend).
// Responsável por obter os dados a partir da API do backend.
// Não conhece a interface: apenas devolve dados brutos (Promises).
class ApiModel {
  #base = '/api';

  // GET no endpoint da API: monta a query string e trata o envelope
  // de resposta ({ ok, dados, erro }).
  async #get(path, params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    const url = qs ? `${this.#base}${path}?${qs}` : `${this.#base}${path}`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (!json.ok) throw new Error(json.erro || 'Erro na requisição');
    return json.dados;
  }

  totalPorAno(modalidade) {
    return this.#get('/total-por-ano', { modalidade });
  }

  rankingCursos(modalidade, ano = 2023) {
    return this.#get('/ranking-cursos', { modalidade, ano });
  }

  rankingIes(modalidade, grupo, ano = 2023) {
    return this.#get('/ranking-ies', { modalidade, grupo, ano });
  }

  linhaDoTempo(curso, modalidade) {
    return this.#get('/linha-do-tempo', { curso, modalidade });
  }

  listarCursos() {
    return this.#get('/cursos');
  }
}

// Instância única (singleton) usada pelo Controller.
const instancia = new ApiModel();
export { instancia as ApiModel };
