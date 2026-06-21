import config from './config/index.js';
import express from 'express';

import routes from './routes/index.js';
import { errorHandler, notFoundHandler, requestLogger } from './middlewares/index.js';
import { initDatabase, createTablesIfNotExist, closePool } from './services/databaseService.js';

const app = express();

// -------------------------------------------------------------------
// Middlewares
// -------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// -------------------------------------------------------------------
// Rotas
// -------------------------------------------------------------------
app.use('/api', routes);

// 404 para rotas não registradas
app.use(notFoundHandler);

// Error handler — deve ser o último middleware
app.use(errorHandler);

// -------------------------------------------------------------------
// Inicialização
// -------------------------------------------------------------------
async function start() {
  console.info(`[server] Iniciando em modo ${config.server.nodeEnv}...`);

  await initDatabase();
  await createTablesIfNotExist();

  if (config.webhook.secret) {
    console.info('[webhook] Token de segurança configurado');
  } else {
    console.warn('[webhook] WEBHOOK_SECRET não definido — endpoint público. Recomendado definir em produção.');
  }

  await new Promise((resolve) => {
    app.listen(config.server.port, () => {
      console.info(`[server] Escutando na porta ${config.server.port}`);
      console.info(`[webhook] Endpoint: POST http://localhost:${config.server.port}/api/webhook/rd-station`);
      resolve();
    });
  });

  console.info('[server] Aplicação iniciada com sucesso');
}

// -------------------------------------------------------------------
// Graceful shutdown
// -------------------------------------------------------------------
async function shutdown(signal) {
  console.info(`[server] Sinal ${signal} recebido — encerrando...`);
  await closePool();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[fatal] Exceção não capturada:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[fatal] Promise rejeitada sem tratamento:', reason);
  process.exit(1);
});

// -------------------------------------------------------------------
// Entrypoint
// -------------------------------------------------------------------
start().catch((err) => {
  console.error('[fatal] Falha ao iniciar a aplicação:', err.message);
  process.exit(1);
});

export default app;
