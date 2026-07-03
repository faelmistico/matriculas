// Ponto de entrada da aplicação (servidor Express: API + Views).
import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n  Servidor rodando em http://localhost:${PORT}`);
  console.log(`  API disponível em     http://localhost:${PORT}/api\n`);
});
