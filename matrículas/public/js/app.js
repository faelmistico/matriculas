// Bootstrap do frontend (MVC).
// Instancia o Controller e faz o "binding" dos elementos da View (DOM)
// com as ações do Controller.
import { DashboardController } from './controllers/DashboardController.js';

const ctrl = new DashboardController();

function on(id, evento, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evento, handler);
}

async function popularSeletorCursos() {
  const select = document.getElementById('selectCurso');
  const cursos = await ctrl.carregarListaCursos();
  const frag = document.createDocumentFragment();
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = '— selecione um curso —';
  frag.appendChild(opt0);
  cursos.forEach((nome) => {
    const o = document.createElement('option');
    o.value = nome;
    o.textContent = nome;
    frag.appendChild(o);
  });
  select.appendChild(frag);
}

function tratarErro(fn) {
  return async (...args) => {
    try { await fn(...args); } catch (e) {
      console.error(e);
      alert('Erro ao carregar dados: ' + e.message);
    }
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  // --- Filtro: total por ano (Todos / EaD / Presencial) ---
  on('filtroTotalModalidade', 'change', tratarErro((e) => {
    ctrl.estado.totalModalidade = e.target.value;
    return ctrl.carregarTotalPorAno();
  }));

  // --- Filtro: ranking IES presencial (públicas/privadas) ---
  on('filtroIesPresencial', 'change', tratarErro((e) => {
    ctrl.estado.iesPresencialGrupo = e.target.value;
    return ctrl.carregarRankingIesPresencial();
  }));

  // --- Filtro: ranking IES EaD (públicas/privadas) ---
  on('filtroIesEad', 'change', tratarErro((e) => {
    ctrl.estado.iesEadGrupo = e.target.value;
    return ctrl.carregarRankingIesEad();
  }));

  // --- Linha do tempo: curso + modalidade ---
  on('selectCurso', 'change', tratarErro((e) => {
    ctrl.estado.cursoSelecionado = e.target.value;
    return ctrl.carregarLinhaDoTempo();
  }));
  on('filtroLinhaModalidade', 'change', tratarErro((e) => {
    ctrl.estado.linhaModalidade = e.target.value;
    return ctrl.carregarLinhaDoTempo();
  }));

  // --- Carregamento inicial ---
  await tratarErro(async () => {
    await Promise.all([
      ctrl.carregarTotalPorAno(),
      ctrl.carregarRankingCursos(),
      ctrl.carregarRankingIesPresencial(),
      ctrl.carregarRankingIesEad(),
      popularSeletorCursos(),
    ]);
  })();
});
