import {
  insertOrUpdateLead,
  getAllLeads as dbGetAllLeads,
  getLeadById as dbGetLeadById,
  getLeadsByClassificacao as dbGetLeadsByClassificacao,
  countLeads,
} from './databaseService.js';
import { mapRDContactToLead } from '../utils/leadMapper.js';

let lastSyncAt = null;

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

// Retorna o estado atual da sincronização via webhook
export async function getSyncStatus() {
  return {
    mode: 'webhook',
    lastWebhookAt: lastSyncAt,
    totalLeads: await countLeads(),
  };
}

