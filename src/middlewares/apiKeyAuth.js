import { timingSafeEqual } from 'crypto';
import config from '../config/index.js';

function extractToken(req) {
  const auth = req.headers['authorization'];
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return req.headers['x-api-key'] ?? null;
}

function safeCompare(a, b) {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) {
      // Roda timingSafeEqual mesmo assim para não vazar timing via branch
      timingSafeEqual(ba, Buffer.alloc(ba.length));
      return false;
    }
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function apiKeyAuth(req, res, next) {
  const token = extractToken(req);

  if (!token || !safeCompare(token, config.protheus.apiKey)) {
    return res.status(401).json({ success: false, error: 'API key ausente ou inválida' });
  }

  next();
}
