// Model de domínio (camada Model do MVC).
// Representa um curso ofertado por uma IES e concentra as regras de domínio:
// derivação do grupo (Pública/Privada), classificação de modalidade e os
// rótulos usados na apresentação. É a fonte única de verdade dessas regras.
export default class Curso {
  constructor({
    estado, cidade, ies, sigla, organizacao, categoriaAdministrativa,
    nomeCurso, nomeDetalhado, grau, modalidade,
  }) {
    this.estado = estado;
    this.cidade = cidade;
    this.ies = ies;
    this.sigla = sigla;
    this.organizacao = organizacao;
    this.categoriaAdministrativa = categoriaAdministrativa;
    this.nomeCurso = nomeCurso;
    this.nomeDetalhado = nomeDetalhado;
    this.grau = grau;
    this.modalidade = modalidade;
  }

  // Regra de negócio: qualquer categoria que comece com "Pública" é do
  // grupo público; as demais (Privada com/sem fins, Especial) são privadas.
  get categoriaGrupo() {
    const cat = (this.categoriaAdministrativa || '').trim();
    return cat.toLowerCase().startsWith('públic') ? 'Pública' : 'Privada';
  }

  ehPublica() {
    return this.categoriaGrupo === 'Pública';
  }

  ehEaD() {
    return (this.modalidade || '').trim().toLowerCase() === 'ead';
  }

  // Rótulo curto para exibição/rankings: prefere a sigla, cai para o nome da IES.
  rotulo() {
    const s = (this.sigla || '').trim();
    return s || this.ies;
  }

  // Descrição legível do curso (curso — IES · modalidade).
  descricao() {
    return `${this.nomeCurso} — ${this.ies} · ${this.modalidade}`;
  }

  // Serialização para a API: inclui o grupo derivado (getters não são
  // serializados automaticamente por JSON.stringify).
  toJSON() {
    return {
      estado: this.estado,
      cidade: this.cidade,
      ies: this.ies,
      sigla: this.sigla,
      organizacao: this.organizacao,
      categoriaAdministrativa: this.categoriaAdministrativa,
      categoriaGrupo: this.categoriaGrupo,
      nomeCurso: this.nomeCurso,
      nomeDetalhado: this.nomeDetalhado,
      grau: this.grau,
      modalidade: this.modalidade,
    };
  }
}
