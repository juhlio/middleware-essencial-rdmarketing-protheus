import axios from 'axios';
import config from '../config/index.js';
import { getValidAccessToken } from './authService.js';

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1_000;

// -------------------------------------------------------------------
// Cria cliente axios com o access token atual do OAuth2
// -------------------------------------------------------------------
async function makeClient() {
  const token = await getValidAccessToken();
  return axios.create({
    baseURL: config.rdStation.apiUrl,
    timeout: TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// -------------------------------------------------------------------
// Retry com exponential backoff
// -------------------------------------------------------------------
function isRetryable(err) {
  if (!err.response) return true;
  return [429, 500, 502, 503, 504].includes(err.response.status);
}

async function withRetry(fn, retries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === retries) break;
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      console.warn(`[rd-station] Tentativa ${attempt} falhou — retry em ${delay}ms:`, err.message);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// -------------------------------------------------------------------
// Normalização de erros
// -------------------------------------------------------------------
function handleApiError(err, context) {
  const status = err.response?.status;
  const detail = err.response?.data?.error ?? err.message;

  if (status === 401) {
    throw Object.assign(new Error('Token RD Station inválido ou expirado'), { status: 401 });
  }
  if (status === 429) {
    throw Object.assign(new Error('Rate limit atingido na API do RD Station'), { status: 429 });
  }
  if (err.code === 'ECONNABORTED') {
    throw Object.assign(new Error(`Timeout ao chamar RD Station (${TIMEOUT_MS}ms) — ${context}`), { status: 504 });
  }

  throw Object.assign(new Error(`RD Station API error [${context}]: ${detail}`), { status: status ?? 500 });
}

// -------------------------------------------------------------------
// Busca uma página de contatos
// -------------------------------------------------------------------
export async function getContacts(page = 1, pageSize = config.sync.batchSize) {
  try {
    const client = await makeClient();
    const response = await withRetry(() =>
      client.get('/contacts', { params: { page, page_size: pageSize } })
    );
    return response.data?.contacts ?? [];
  } catch (err) {
    handleApiError(err, `getContacts(page=${page})`);
  }
}

// -------------------------------------------------------------------
// Busca todos os contatos paginando até o fim
// -------------------------------------------------------------------
export async function getAllContactsPaginated() {
  const all = [];
  let page = 1;

  while (true) {
    const contacts = await getContacts(page, config.sync.batchSize);
    if (!Array.isArray(contacts) || contacts.length === 0) break;

    all.push(...contacts);
    console.info(`[rd-station] Página ${page} — ${contacts.length} contatos (total: ${all.length})`);

    if (contacts.length < config.sync.batchSize) break;
    page++;
  }

  return all;
}

// -------------------------------------------------------------------
// Atualiza status de um contato (sync reversa — futuro)
// -------------------------------------------------------------------
export async function updateContactStatus(contactId, status) {
  if (!contactId) throw new Error('contactId é obrigatório');
  try {
    const client = await makeClient();
    const response = await withRetry(() =>
      client.put(`/contacts/${contactId}`, { status })
    );
    return response.data;
  } catch (err) {
    handleApiError(err, `updateContactStatus(id=${contactId})`);
  }
}
