import { Router } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { processWebhookPayload } from '../services/leadService.js';
import config from '../config/index.js';

const router = Router();

function validateWebhookToken(req, res, next) {
  const secret = config.webhook.secret;
  if (!secret) return next();

  const token = req.query.auth_token ?? req.headers['x-webhook-token'];
  if (token !== secret) {
    return res.status(401).json({ success: false, error: 'Webhook token inválido' });
  }
  next();
}

// POST /api/webhook/rd-station
// Recebe eventos do RD Station Marketing (converted, score changed, opportunity)
router.post('/rd-station', validateWebhookToken, asyncHandler(async (req, res) => {
  console.info('[webhook] payload recebido:', JSON.stringify(req.body));

  try {
    const result = await processWebhookPayload(req.body);
    console.info(`[webhook] ${result.event_type} — ${result.email} (${result.classificacao})`);
    res.json({ success: true, ...result });
  } catch (err) {
    // Retorna 200 para payloads de teste/ping do RD Station que não têm dados de lead
    if (err.status === 400) {
      console.warn('[webhook] payload ignorado (formato não reconhecido):', err.message);
      return res.json({ success: true, message: 'received' });
    }
    throw err;
  }
}));

export default router;
