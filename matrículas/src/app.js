// Configuração da aplicação Express.
// Serve a API (/api) e também os arquivos estáticos do cliente (as Views),
// que ficam em ./public no mesmo projeto (estrutura unificada).
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import analiseRoutes from './routes/analiseRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

// API
app.use('/api', analiseRoutes);

// Views (cliente) — servidas a partir da pasta ../public
const publicDir = join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Healthcheck simples
app.get('/health', (_req, res) => res.json({ ok: true, status: 'up' }));

export default app;
