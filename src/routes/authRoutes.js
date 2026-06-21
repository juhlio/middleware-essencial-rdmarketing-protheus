import { Router } from 'express';
import { getAuthorizationUrl, exchangeCodeForTokens, isAuthorized } from '../services/authService.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

// GET /api/auth/rd-station — inicia o fluxo OAuth2
router.get('/rd-station', (req, res) => {
  const url = getAuthorizationUrl();
  res.redirect(url);
});

// GET /api/auth/callback — RD Station redireciona aqui após autorização
router.get('/callback', asyncHandler(async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.status(400).json({
      success: false,
      error: error ?? 'Código de autorização não recebido',
    });
  }

  await exchangeCodeForTokens(code);

  res.json({
    success: true,
    message: 'RD Station autorizado com sucesso! Configure o webhook em app.rdstation.com.br/integracoes/webhooks apontando para POST /api/webhook/rd-station.',
  });
}));

// GET /api/auth/status — verifica se já está autorizado
router.get('/status', asyncHandler(async (req, res) => {
  const authorized = await isAuthorized();
  res.json({
    success: true,
    authorized,
    message: authorized
      ? 'RD Station autorizado'
      : 'Não autorizado — acesse /api/auth/rd-station para autorizar',
  });
}));

export default router;
