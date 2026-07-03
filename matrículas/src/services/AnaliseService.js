// Camada de Serviço: regras de negócio e validação de parâmetros.
// Orquestra o Repository e prepara os dados para os Controllers.
// Não conhece detalhes de SQL nem de HTTP.
import repo from '../repositories/MatriculaRepository.js';

const MODALIDADES_VALIDAS = ['todos', 'EaD', 'Presencial'];
const GRUPOS_VALIDOS = ['todas', 'Pública', 'Privada'];

class AnaliseService {
  #validarModalidade(m) {
    const valor = m || 'todos';
    if (!MODALIDADES_VALIDAS.includes(valor)) {
      throw new Error(`Modalidade inválida: ${m}. Use todos | EaD | Presencial.`);
    }
    return valor;
  }

  #validarGrupo(g) {
    const valor = g || 'todas';
    if (!GRUPOS_VALIDOS.includes(valor)) {
      throw new Error(`Grupo inválido: ${g}. Use todas | Pública | Privada.`);
    }
    return valor;
  }

  totalPorAno(modalidade) {
    return repo.totalPorAno(this.#validarModalidade(modalidade));
  }

  rankingCursos(modalidade, ano) {
    if (!['EaD', 'Presencial'].includes(modalidade)) {
      throw new Error('Ranking de cursos exige modalidade EaD ou Presencial.');
    }
    return repo.rankingCursos(modalidade, ano || 2023, 10);
  }

  rankingIes(modalidade, grupo, ano) {
    if (!['EaD', 'Presencial'].includes(modalidade)) {
      throw new Error('Ranking de IES exige modalidade EaD ou Presencial.');
    }
    return repo.rankingIes(modalidade, this.#validarGrupo(grupo), ano || 2023, 10);
  }

  async linhaDoTempoCurso(nomeCurso, modalidade) {
    if (!nomeCurso || !nomeCurso.trim()) {
      throw new Error('Informe o nome do curso.');
    }
    return repo.linhaDoTempoCurso(nomeCurso.trim(), this.#validarModalidade(modalidade));
  }

  listarNomesCursos() {
    return repo.listarNomesCursos();
  }
}

export default new AnaliseService();
