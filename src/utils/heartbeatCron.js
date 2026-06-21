import cron from 'node-cron';
import { getStats } from '../services/leadService.js';
import { sendHeartbeatEmail } from '../services/emailService.js';

export function initHeartbeatCron() {
  cron.schedule('0 */6 * * *', async () => {
    try {
      const stats = await getStats();
      await sendHeartbeatEmail({
        totalLeads:           stats.totalLeads,
        leadsPorClassificacao: stats.leadsPorClassificacao,
        lastWebhookAt:        stats.lastSync,
        uptimeSeconds:        process.uptime(),
      });
    } catch (err) {
      console.error('[heartbeat] Erro inesperado no cron:', err.message);
    }
  });

  console.info('[heartbeat] Cron agendado — relatório a cada 6 horas');
}
