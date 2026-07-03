// Definição das rotas da API (mapeamento URL -> Controller).
import { Router } from 'express';
import controller from '../controllers/AnaliseController.js';

const router = Router();

// Dados agregados
router.get('/total-por-ano', controller.totalPorAno);        // ?modalidade=todos|EaD|Presencial
router.get('/ranking-cursos', controller.rankingCursos);     // ?modalidade=EaD|Presencial&ano=2023
router.get('/ranking-ies', controller.rankingIes);           // ?modalidade=&grupo=todas|Pública|Privada&ano=2023

// Análises de evolução
router.get('/linha-do-tempo', controller.linhaDoTempoCurso); // ?curso=NOME&modalidade=todos|EaD|Presencial
router.get('/cursos', controller.listarCursos);              // lista de nomes para o seletor

export default router;
