import axios from 'axios';
import config from '../config/index.js';
import { pool } from '../config/database.js';

const RD_AUTH_BASE = 'https://api.rd.services';

// -------------------------------------------------------------------
// Persistência de tokens no banco (tabela settings)
// -------------------------------------------------------------------
async function saveTokens({ accessToken, refreshToken, expiresAt }) {
  await pool.query(`
    INSERT INTO settings (key, value) VALUES
      ('rd_access_token',  $1),
      ('rd_refresh_token', $2),
      ('rd_token_expires_at', $3)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `, [accessToken, refreshToken, expiresAt.toISOString()]);
}

async function loadTokens() {
  const { rows } = await pool.query(
    `SELECT key, value FROM settings WHERE key IN ('rd_access_token','rd_refresh_token','rd_token_expires_at')`
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    accessToken: map['rd_access_token'] ?? null,
    refreshToken: map['rd_refresh_token'] ?? null,
    expiresAt: map['rd_token_expires_at'] ? new Date(map['rd_token_expires_at']) : null,
  };
}

// -------------------------------------------------------------------
// Gera URL de autorização para redirecionar o usuário
// -------------------------------------------------------------------
export function getAuthorizationUrl() {
  const params = new URLSearchParams({
    client_id:     config.rdStation.clientId,
    redirect_uri:  config.rdStation.redirectUri,
  });
  return `${RD_AUTH_BASE}/auth/dialog?${params}`;
}

// -------------------------------------------------------------------
// Troca o code (recebido no callback) por access_token + refresh_token
// -------------------------------------------------------------------
export async function exchangeCodeForTokens(code) {
  const { data } = await axios.post(`${RD_AUTH_BASE}/auth/token`, {
    client_id:     config.rdStation.clientId,
    client_secret: config.rdStation.clientSecret,
    redirect_uri:  config.rdStation.redirectUri,
    code,
  });

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await saveTokens({
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  });

  console.info('[auth] Tokens RD Station salvos com sucesso');
  return data.access_token;
}

// -------------------------------------------------------------------
// Renova o access_token usando o refresh_token
// -------------------------------------------------------------------
async function refreshAccessToken(refreshToken) {
  const { data } = await axios.post(`${RD_AUTH_BASE}/auth/token`, {
    client_id:     config.rdStation.clientId,
    client_secret: config.rdStation.clientSecret,
    refresh_token: refreshToken,
  });

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await saveTokens({
    accessToken:  data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt,
  });

  console.info('[auth] Access token RD Station renovado');
  return data.access_token;
}

// -------------------------------------------------------------------
// Retorna um access_token válido (renova automaticamente se expirado)
// -------------------------------------------------------------------
export async function getValidAccessToken() {
  const tokens = await loadTokens();

  if (!tokens.accessToken || !tokens.refreshToken) {
    throw Object.assign(
      new Error('RD Station não autorizado — acesse /api/auth/rd-station para autorizar'),
      { status: 401 }
    );
  }

  // Renova se expirar nos próximos 5 minutos
  const expiresInMs = tokens.expiresAt ? tokens.expiresAt - Date.now() : 0;
  if (expiresInMs < 5 * 60 * 1000) {
    return refreshAccessToken(tokens.refreshToken);
  }

  return tokens.accessToken;
}

// -------------------------------------------------------------------
// Verifica se já existe autorização salva
// -------------------------------------------------------------------
export async function isAuthorized() {
  const tokens = await loadTokens();
  return !!(tokens.accessToken && tokens.refreshToken);
}
