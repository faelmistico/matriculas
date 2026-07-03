// Camada Controller (MVC): recebe requisições HTTP, extrai parâmetros,
// delega ao Service e devolve a resposta JSON. Sem regra de negócio aqui.
import service from '../services/AnaliseService.js';

// Wrapper para padronizar tratamento de erros das actions assíncronas.
const acao = (fn) => async (req, res) => {
  try {
    const dados = await fn(req);
    res.json({ ok: true, dados });
  } catch (err) {
    console.error('[Controller]', err.message);
    res.status(400).json({ ok: false, erro: err.message });
  }
};

class AnaliseController {
  totalPorAno = acao((req) => service.totalPorAno(req.query.modalidade));

  rankingCursos = acao((req) =>
    service.rankingCursos(req.query.modalidade, Number(req.query.ano) || 2023));

  rankingIes = acao((req) =>
    service.rankingIes(req.query.modalidade, req.query.grupo, Number(req.query.ano) || 2023));

  linhaDoTempoCurso = acao((req) =>
    service.linhaDoTempoCurso(req.query.curso, req.query.modalidade));

  listarCursos = acao(() => service.listarNomesCursos());
}

export default new AnaliseController();
