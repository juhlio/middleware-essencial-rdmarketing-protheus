import config from '../config/index.js';

const isDev = config.server.nodeEnv === 'development';

export function errorHandler(err, req, res, next) {
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message ?? 'Erro interno no servidor';

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} — ${status}:`, err);
  } else {
    console.warn(`[warn] ${req.method} ${req.originalUrl} — ${status}: ${message}`);
  }

  const body = { success: false, error: message };

  if (isDev && err.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Endpoint não encontrado: ${req.method} ${req.originalUrl}`,
  });
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
