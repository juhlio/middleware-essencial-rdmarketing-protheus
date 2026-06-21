export { errorHandler, notFoundHandler, asyncHandler } from './errorHandler.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.info(`[http] ${req.method} ${req.originalUrl} ${res.statusCode} — ${ms}ms`);
  });
  next();
}
