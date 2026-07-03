# Matrículas na Graduação — Região Sul do Brasil

Aplicação web para análise do número de alunos matriculados em cursos de
graduação na Região Sul (PR, SC, RS), a partir do Censo da Educação Superior
(2009–2023).

## Arquitetura

O projeto é um **único projeto Node** que adota o padrão **MVC** de forma
explícita nas duas camadas (servidor e cliente) e usa o **Repository Pattern**
para a persistência em um **SGBD relacional (PostgreSQL / Supabase)**. O mesmo
servidor Express expõe a API (`/api`) e serve as Views estáticas (`public/`).

```
matriculas/                       # projeto único (uma package.json na raiz)
├── src/                          # MVC do SERVIDOR (Node.js + Express)
│   ├── config/                   #   conexão com o SGBD (pool PostgreSQL)
│   │   └── database.js
│   ├── models/                   # [M] Model de domínio
│   │   ├── Curso.js              #     entidade (regras Pública/Privada, modalidade)
│   │   └── Resultados.js         #     read-models: TotalAnual, RankingCurso, RankingIes
│   ├── repositories/             #     Repository — TODO o acesso ao SGBD (SQL)
│   │   └── MatriculaRepository.js
│   ├── services/                 #     regras de negócio / validação
│   │   └── AnaliseService.js
│   ├── controllers/              # [C] Controller — recebe HTTP, devolve JSON
│   │   └── AnaliseController.js
│   ├── routes/                   #     mapeamento de rotas
│   │   └── analiseRoutes.js
│   ├── app.js                    #     app Express (API + serve as Views de ./public)
│   └── server.js                 #     ponto de entrada
├── public/                       # MVC do CLIENTE (HTML + CSS + JS) — servido pelo Express
│   ├── index.html                # [V] View (estrutura da página)
│   ├── css/styles.css            # [V] View (estilo moderno)
│   └── js/
│       ├── models/ApiModel.js         # [M] Model — busca dados na API
│       ├── views/ChartView.js         # [V] View — renderiza os gráficos
│       ├── controllers/
│       │   └── DashboardController.js  # [C] Controller — orquestra Model/View
│       └── app.js                     #     bootstrap / binding de eventos
├── db/schema.sql                 #     esquema do banco (DDL)
├── scripts/
│   ├── aplicar-schema.js         #     cria as tabelas
│   ├── importar-csv.js           #     ETL: CSV -> PostgreSQL (INSERTs)
│   └── importar-csv-copy.js      #     ETL rápido via COPY (streaming)
├── Matriculados Região Sul.csv   #     base de dados (fonte)
└── package.json
```

**Camadas do MVC (servidor):**
- **Model** — `Curso.js` (entidade de domínio) e os read-models de `Resultados.js`
  (`TotalAnual`, `RankingCurso`, `RankingIes`), persistidos via `MatriculaRepository.js` (Repository).
- **View** — as páginas em `public/` servidas como conteúdo estático (consomem a API JSON).
- **Controller** — `AnaliseController.js` traduz requisições HTTP em chamadas ao Service.

**Camadas do MVC (cliente):**
- **Model** — `ApiModel.js` (dados vindos da API).
- **View** — `index.html` + `ChartView.js` (apresentação/gráficos).
- **Controller** — `DashboardController.js` (reage aos filtros e coordena Model↔View).

> **Observação sobre a arquitetura:** por ser uma aplicação web cliente-servidor,
> há um MVC no servidor (API) e um MVC no cliente (navegador). Isso é intencional
> e correto — são runtimes distintos. Os dois residem no **mesmo projeto/pasta**,
> com o servidor Express servindo diretamente as Views de `public/`.

## Tecnologias
- **Cliente (Views):** HTML, CSS, JavaScript (ES Modules) + Chart.js
- **Servidor:** Node.js + Express
- **Banco:** PostgreSQL (Supabase)

## Pré-requisitos
- Node.js 18+ (testado com v22)
- Um projeto no [Supabase](https://supabase.com) com PostgreSQL

## Configuração

1. Instale as dependências (na raiz do projeto):
   ```bash
   npm install
   ```

2. Crie o arquivo `.env` a partir do exemplo e preencha a connection string
   do Supabase (Project Settings → Database → Connection string → URI):
   ```bash
   cp .env.example .env
   # edite .env e defina DATABASE_URL=postgresql://...
   ```

3. Crie as tabelas no banco:
   ```bash
   npm run db:schema
   ```

4. Importe o CSV (`Matriculados Região Sul.csv`, na raiz do projeto). O import
   usa `COPY` (streaming server-side) — carrega ~209 mil cursos e ~680 mil
   registros anuais em segundos:
   ```bash
   npm run db:import
   ```

5. Suba o servidor:
   ```bash
   npm start
   ```

6. Acesse **http://localhost:3000**

## Funcionalidades
**Dados agregados**
- Total de matriculados por ano (filtro: Todos / EaD / Presencial)
- Top 10 cursos Presenciais em 2023
- Top 10 cursos EaD em 2023
- Top 10 IES Presenciais em 2023 (filtro: Públicas / Privadas)
- Top 10 IES EaD em 2023 (filtro: Públicas / Privadas)

**Análise de evolução**
- Linha do tempo de um curso, ano a ano (filtro: Todos / EaD / Presencial)

## API
| Método | Rota | Parâmetros |
|--------|------|------------|
| GET | `/api/total-por-ano` | `modalidade=todos\|EaD\|Presencial` |
| GET | `/api/ranking-cursos` | `modalidade=EaD\|Presencial&ano=2023` |
| GET | `/api/ranking-ies` | `modalidade=EaD\|Presencial&grupo=todas\|Pública\|Privada&ano=2023` |
| GET | `/api/linha-do-tempo` | `curso=NOME&modalidade=todos\|EaD\|Presencial` |
| GET | `/api/cursos` | — (lista nomes de cursos) |
