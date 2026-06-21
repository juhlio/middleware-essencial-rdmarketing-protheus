import { jest } from '@jest/globals';

// Mocks do databaseService e emailService para testar a lógica de was_inserted
const mockInsertOrUpdateLead = jest.fn();
const mockCountLeads = jest.fn().mockResolvedValue(0);
const mockCountLeadsPorClassificacao = jest.fn().mockResolvedValue({ QUENTE: 0, MORNO: 0, FRIO: 0 });
const mockSendNewLeadEmail = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../src/services/databaseService.js', () => ({
  insertOrUpdateLead:          mockInsertOrUpdateLead,
  getAllLeads:                  jest.fn(),
  getLeadById:                 jest.fn(),
  getLeadsByClassificacao:     jest.fn(),
  countLeads:                  mockCountLeads,
  countLeadsPorClassificacao:  mockCountLeadsPorClassificacao,
}));

jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendNewLeadEmail: mockSendNewLeadEmail,
}));

jest.unstable_mockModule('../src/config/index.js', () => ({
  default: {
    server: { nodeEnv: 'test' },
    webhook: { secret: '' },
    protheus: { apiKey: 'test' },
    email: {
      smtpHost: 'x', smtpPort: 465, smtpSecure: true,
      smtpUser: 'x', smtpPass: 'x', from: 'x', notifyTo: 'x',
    },
  },
}));

const { processWebhookPayload } = await import('../src/services/leadService.js');

const webhookPayload = {
  leads: [{
    id: '123456',
    email: 'lead@test.com',
    name: 'Lead Teste',
    lead_score: 75,
    custom_fields: {},
    tags: [],
  }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSendNewLeadEmail.mockResolvedValue(undefined);
});

describe('processWebhookPayload — notificação de e-mail', () => {
  test('was_inserted=true → sendNewLeadEmail chamado', async () => {
    mockInsertOrUpdateLead.mockResolvedValue({
      id: 1,
      email: 'lead@test.com',
      name: 'Lead Teste',
      classificacao: 'QUENTE',
      lead_score: 75,
      was_inserted: true,
    });

    await processWebhookPayload(webhookPayload);

    // fire-and-forget: aguarda a microtask queue para o .catch() ser executado
    await new Promise((r) => setImmediate(r));

    expect(mockSendNewLeadEmail).toHaveBeenCalledTimes(1);
    expect(mockSendNewLeadEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'lead@test.com', was_inserted: true })
    );
  });

  test('was_inserted=false → sendNewLeadEmail NÃO chamado', async () => {
    mockInsertOrUpdateLead.mockResolvedValue({
      id: 1,
      email: 'lead@test.com',
      name: 'Lead Teste',
      classificacao: 'QUENTE',
      lead_score: 75,
      was_inserted: false,
    });

    await processWebhookPayload(webhookPayload);

    await new Promise((r) => setImmediate(r));

    expect(mockSendNewLeadEmail).not.toHaveBeenCalled();
  });

  test('falha no sendNewLeadEmail não rejeita processWebhookPayload', async () => {
    mockInsertOrUpdateLead.mockResolvedValue({
      id: 2,
      email: 'lead@test.com',
      classificacao: 'FRIO',
      lead_score: 10,
      was_inserted: true,
    });
    mockSendNewLeadEmail.mockRejectedValue(new Error('SMTP offline'));

    await expect(processWebhookPayload(webhookPayload)).resolves.toBeDefined();

    await new Promise((r) => setImmediate(r));
  });
});
