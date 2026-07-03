DROP TABLE IF EXISTS matriculas_anuais CASCADE;

DROP TABLE IF EXISTS cursos CASCADE;

CREATE TABLE cursos (
    id SERIAL PRIMARY KEY,
    estado TEXT NOT NULL,
    cidade TEXT,
    ies TEXT NOT NULL,
    sigla TEXT,
    organizacao TEXT,
    categoria_administrativa TEXT,
    -- Grupo derivado da categoria para os filtros "Pública / Privada"
    categoria_grupo TEXT NOT NULL,
    -- 'Pública' ou 'Privada'
    nome_curso TEXT NOT NULL,
    nome_detalhado TEXT,
    grau TEXT,
    modalidade TEXT NOT NULL -- 'Presencial' ou 'EaD'
);

CREATE TABLE matriculas_anuais (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    ano SMALLINT NOT NULL,
    quantidade INTEGER NOT NULL
);

-- Índices que sustentam as consultas de agregação/ranking/linha do tempo
CREATE INDEX idx_ma_curso ON matriculas_anuais (curso_id);

CREATE INDEX idx_ma_ano ON matriculas_anuais (ano);

CREATE INDEX idx_cursos_modal ON cursos (modalidade);

CREATE INDEX idx_cursos_nome ON cursos (nome_curso);

CREATE INDEX idx_cursos_grupo ON cursos (categoria_grupo);

CREATE INDEX idx_cursos_ies ON cursos (ies);