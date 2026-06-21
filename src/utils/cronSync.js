import cron from 'node-cron';
import { syncFromRDStation, setNextSyncTime } from '../services/leadService.js';

let _intervalMinutes = 30;

function buildExpression(intervalMinutes) {
  return `*/${intervalMinutes} * * * *`;
}

function scheduleNext() {
  const next = new Date(Date.now() + _intervalMinutes * 60 * 1000);
  setNextSyncTime(next);
  return next;
}

export function initCronSync(intervalMinutes = 30) {
  _intervalMinutes = intervalMinutes;
  const expression = buildExpression(intervalMinutes);

  scheduleNext();

  const task = cron.schedule(expression, async () => {
    console.info('[cron] Iniciando sincronização de leads...');
    const start = Date.now();

    try {
      const result = await syncFromRDStation();
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.info(
        `[cron] Sincronização concluída — ${result.totalLeads} leads em ${elapsed}s`
      );
    } catch (err) {
      console.error('[cron] Erro na sincronização:', err.message);
    } finally {
      const next = scheduleNext();
      console.info(`[cron] Próxima sincronização: ${next.toISOString()}`);
    }
  });

  console.info(
    `[cron] Agendado a cada ${intervalMinutes} minuto(s) — expressão: "${expression}"`
  );

  return task;
}

export function getNextSyncTime(task) {
  if (!task) return null;

  const nextMs = Date.now() + _intervalMinutes * 60 * 1000;
  const nextDate = new Date(nextMs);

  return {
    nextSync: nextDate.toISOString(),
    nextSyncInSeconds: Math.round(_intervalMinutes * 60),
  };
}

export function stopCronSync(task) {
  if (!task) return;
  task.stop();
  console.info('[cron] Job de sincronização encerrado');
}
