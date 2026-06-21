import config from '../config/index.js';
import {
  insertOrUpdateLead,
  bulkUpsertLeads,
  getAllLeads as dbGetAllLeads,
  getLeadById as dbGetLeadById,
  getLeadsByClassificacao as dbGetLeadsByClassificacao,
  countLeads,
} from './databaseService.js';

// -------------------------------------------------------------------
// Estado em memória do ciclo de sync
// -------------------------------------------------------------------
let lastSyncAt = null;
let nextSyncAt = null;

export function setNextSyncTime(date) {
  nextSyncAt = date;
}

// -------------------------------------------------------------------
// Classificação
// -------------------------------------------------------------------
function classificarLead(score) {
  if (score >= 70) return 'QUENTE';
  if (score >= 40) return 'MORNO';
  return 'FRIO';
}

// -------------------------------------------------------------------
// Mapeamento RD Station Marketing → Lead (schema da tabela)
// Campos ref: https://developers.rdstation.com/reference/contacts
// -------------------------------------------------------------------
function mapRDContactToLead(contact) {
  const score = Number(contact.lead_score ?? 0);

  // Custom fields chegam como objeto sem prefixo cf_ no webhook real do RD Station:
  // { cpf_cnpj: "...", potencia_kva: "..." }
  // Também pode vir como array [{ cf_key, value }] ou com prefixo cf_ no top-level
  const cfBase = Array.isArray(contact.custom_fields)
    ? Object.fromEntries(contact.custom_fields.map((f) => [f.cf_key ?? f.key, f.value]))
    : (contact.custom_fields ?? {});
  const cfTopLevel = Object.fromEntries(
    Object.entries(contact).filter(([k]) => k.startsWith('cf_'))
  );
  const cf = { ...cfBase, ...cfTopLevel };

  // opportunity pode vir como boolean ou string "false"/"true"
  const isOpportunity = contact.opportunity === true || contact.opportunity === 'true';

  return {
    rd_id:              contact.id ? Number(contact.id) : null,
    uuid:               contact.uuid ?? null,
    name:               contact.name ?? null,
    email:              contact.email ?? null,
    phone:              contact.personal_phone ?? contact.mobile_phone ?? contact.phone ?? null,
    cnpj_cpf:           cf.cf_cnpj_cpf ?? cf.cnpj_cpf ?? cf.cpf_cnpj ?? null,
    company_name:       contact.company_name ?? contact.company ?? null,
    city:               contact.city ?? null,
    state:              contact.state ?? null,
    segmento:           cf.cf_segmento ?? cf.segmento ?? null,
    potencia:           cf.cf_potencia ?? cf.potencia ?? cf.potencia_kva ?? null,
    tipo_combustivel:   cf.cf_tipo_combustivel ?? cf.tipo_combustivel ?? null,
    periodo_locacao:    cf.cf_periodo_locacao ?? cf.periodo_locacao ?? null,
    aplicacao:          cf.cf_aplicacao ?? cf.aplicacao ?? null,
    origem_formulario:  contact.traffic_source ?? cf.cf_origem_formulario ?? null,
    lead_score:         score,
    classificacao:      classificarLead(score),
    tags:               contact.tags ?? null,
    status_oportunidade: isOpportunity ? 'OPORTUNIDADE' : null,
    created_at:         contact.created_at ?? null,
    updated_at:         contact.updated_at ?? null,
  };
}

// -------------------------------------------------------------------
// Webhook — processa payload enviado pelo RD Station Marketing
// -------------------------------------------------------------------
export async function processWebhookPayload(body) {
  let contactData;
  let event_type = 'WEBHOOK.CONVERTED';

  if (Array.isArray(body?.leads) && body.leads.length > 0) {
    // Formato real do RD Station Marketing: { leads: [{ id, email, name, custom_fields, ... }] }
    const raw = body.leads[0];
    contactData = { ...raw };

    // conversion_identifier dentro de first_conversion vira origem_formulario
    const convId = raw.first_conversion?.content?.conversion_identifier;
    if (convId && !contactData.traffic_source) {
      contactData.traffic_source = convId;
    }
  } else if (body?.event_type && body?.payload) {
    // Formato padrão de webhook documentado: { event_type, payload: { contact/leads } }
    event_type = body.event_type;
    const payload = body.payload;
    const raw =
      (Array.isArray(payload.leads) && payload.leads[0]) ??
      payload.contact ??
      payload;
    contactData = { ...raw };

    if (payload.conversion_identifier && !contactData.traffic_source) {
      contactData.traffic_source = payload.conversion_identifier;
    }
    if (event_type === 'WEBHOOK.MARKED_OPPORTUNITY') {
      contactData.opportunity = true;
    }
  } else {
    throw Object.assign(
      new Error('Payload inválido — formato não reconhecido'),
      { status: 400 }
    );
  }

  const lead = mapRDContactToLead(contactData);

  if (!lead.email) {
    throw Object.assign(
      new Error('Payload sem email — lead não pode ser salvo'),
      { status: 400 }
    );
  }

  const saved = await insertOrUpdateLead(lead);
  lastSyncAt = new Date().toISOString();

  return {
    event_type,
    email: saved.email,
    classificacao: saved.classificacao,
    lead_id: saved.id,
  };
}

// -------------------------------------------------------------------
// Sync manual (não suportado pela API do Marketing — use webhook)
// -------------------------------------------------------------------
export async function syncFromRDStation() {
  throw Object.assign(
    new Error(
      'A API do RD Station Marketing não oferece listagem em massa de contatos. ' +
      'Configure um webhook em app.rdstation.com.br/integracoes → Webhooks ' +
      'apontando para POST /api/webhook/rd-station'
    ),
    { status: 501 }
  );
}

// -------------------------------------------------------------------
// Queries (delegam ao databaseService)
// -------------------------------------------------------------------
export async function getAllLeads(filters) {
  return dbGetAllLeads(filters);
}

export async function getLeadById(id) {
  return dbGetLeadById(id);
}

export async function getLeadsByClassificacao(tipo) {
  return dbGetLeadsByClassificacao(tipo);
}

export async function getStats() {
  return {
    totalLeads: await countLeads(),
    lastSync: lastSyncAt,
  };
}

export async function getNextSyncTime() {
  const total = await countLeads();
  const next = nextSyncAt ? new Date(nextSyncAt).toISOString() : null;
  const nextSyncInSeconds = nextSyncAt
    ? Math.max(0, Math.round((new Date(nextSyncAt) - Date.now()) / 1000))
    : null;

  return {
    nextSync: next,
    nextSyncInSeconds,
    lastSync: lastSyncAt,
    totalLeads: total,
    intervalMinutes: config.sync.intervalMinutes,
  };
}
