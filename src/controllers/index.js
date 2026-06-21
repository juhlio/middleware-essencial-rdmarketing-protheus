import * as leadService from '../services/leadService.js';

export async function getHealth(req, res, next) {
  try {
    const stats = await leadService.getStats();
    res.json({
      status: 'ok',
      service: 'RD Station Middleware',
      uptime: Math.floor(process.uptime()),
      leads_cached: stats.totalLeads,
      last_sync: stats.lastSync,
    });
  } catch (err) {
    next(err);
  }
}

export async function getLeads(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? '100', 10), 1000);
    const offset = Math.max(parseInt(req.query.offset ?? '0', 10), 0);

    const filters = {
      classificacao: req.query.classificacao ?? null,
      segmento: req.query.segmento ?? null,
      limit,
      offset,
    };

    const { data, total } = await leadService.getAllLeads(filters);

    res.json({
      success: true,
      total,
      limit,
      offset,
      returned: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getLead(req, res, next) {
  try {
    const lead = await leadService.getLeadById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }

    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
}

export async function getLeadsByClassificacao(req, res, next) {
  try {
    const { tipo } = req.params;
    const { data, total } = await leadService.getLeadsByClassificacao(tipo.toUpperCase());

    res.json({ success: true, total, data });
  } catch (err) {
    next(err);
  }
}

export async function syncNow(req, res) {
  res.status(501).json({
    success: false,
    message:
      'Sync em massa não é suportado pela API do RD Station Marketing. ' +
      'Configure um webhook em app.rdstation.com.br/integracoes → Webhooks ' +
      'apontando para POST /api/webhook/rd-station',
  });
}

export async function getStatus(req, res, next) {
  try {
    const status = await leadService.getNextSyncTime();

    res.json({
      success: true,
      next_sync: status.nextSync,
      next_sync_in_seconds: status.nextSyncInSeconds,
      last_sync: status.lastSync,
      total_leads: status.totalLeads,
    });
  } catch (err) {
    next(err);
  }
}
