// Modelos de resultado (read-models) da camada Model.
// Representam, com tipo próprio, os retornos das consultas analíticas — em vez
// de objetos literais anônimos. São "value objects": imutáveis e sem identidade.
// Os campos são públicos para serem serializados diretamente na resposta JSON.

// Total de matriculados em um ano (usado em "total por ano" e "linha do tempo").
export class TotalAnual {
  constructor(ano, total) {
    this.ano = ano;
    this.total = total;
  }
}

// Item do ranking de cursos (nome do curso + total de matrículas).
export class RankingCurso {
  constructor(nome, total) {
    this.nome = nome;
    this.total = total;
  }
}

// Item do ranking de IES (instituição + sigla + total de matrículas).
export class RankingIes {
  constructor(ies, sigla, total) {
    this.ies = ies;
    this.sigla = sigla;
    this.total = total;
  }

  // Rótulo curto para exibição: prefere a sigla, cai para o nome da IES.
  rotulo() {
    const s = (this.sigla || '').trim();
    return s || this.ies;
  }
}
