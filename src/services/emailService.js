import nodemailer from 'nodemailer';
import config from '../config/index.js';

function createTransporter() {
  return nodemailer.createTransport({
    host:   config.email.smtpHost,
    port:   config.email.smtpPort,
    secure: config.email.smtpSecure,
    auth: {
      user: config.email.smtpUser,
      pass: config.email.smtpPass,
    },
  });
}

export async function sendHeartbeatEmail({ totalLeads, leadsPorClassificacao, lastWebhookAt, uptimeSeconds }) {
  try {
    const uptime = formatUptime(uptimeSeconds);
    const lastWebhook = lastWebhookAt
      ? new Date(lastWebhookAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      : 'Nenhum webhook recebido ainda';

    const text = [
      `Heartbeat — Middleware RD Station → Protheus`,
      ``,
      `Total de leads: ${totalLeads}`,
      `  QUENTE : ${leadsPorClassificacao.QUENTE}`,
      `  MORNO  : ${leadsPorClassificacao.MORNO}`,
      `  FRIO   : ${leadsPorClassificacao.FRIO}`,
      ``,
      `Último webhook recebido: ${lastWebhook}`,
      `Uptime do serviço: ${uptime}`,
    ].join('\n');

    await createTransporter().sendMail({
      from:    config.email.from,
      to:      config.email.notifyTo,
      subject: `[Middleware RD Station] Heartbeat — ${totalLeads} leads`,
      text,
    });

    console.info('[email] Heartbeat enviado');
  } catch (err) {
    console.error('[email] Falha ao enviar heartbeat:', err.message);
  }
}

export async function sendNewLeadEmail(lead) {
  try {
    const nome = lead.name || lead.email;
    const text = [
      `Novo lead recebido no Middleware RD Station → Protheus`,
      ``,
      `Nome        : ${lead.name ?? '—'}`,
      `E-mail      : ${lead.email ?? '—'}`,
      `Classificação: ${lead.classificacao ?? '—'}`,
      `Score       : ${lead.lead_score ?? 0}`,
      `Segmento    : ${lead.segmento ?? '—'}`,
      `Empresa     : ${lead.company_name ?? '—'}`,
    ].join('\n');

    await createTransporter().sendMail({
      from:    config.email.from,
      to:      config.email.notifyTo,
      subject: `[Middleware RD Station] Novo lead: ${nome}`,
      text,
    });

    console.info(`[email] Notificação de novo lead enviada: ${lead.email}`);
  } catch (err) {
    console.error('[email] Falha ao enviar notificação de novo lead:', err.message);
  }
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}
