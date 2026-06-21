import { jest } from '@jest/globals';

// Mocks antes dos imports dinâmicos
const mockSendMail = jest.fn();

jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
  },
}));

jest.unstable_mockModule('../src/config/index.js', () => ({
  default: {
    server: { nodeEnv: 'test' },
    webhook: { secret: '' },
    protheus: { apiKey: 'test-key' },
    email: {
      smtpHost:   'mail.test.com',
      smtpPort:   465,
      smtpSecure: true,
      smtpUser:   'user@test.com',
      smtpPass:   'pass',
      from:       'user@test.com',
      notifyTo:   'destino@test.com',
    },
  },
}));

const { sendHeartbeatEmail, sendNewLeadEmail } = await import('../src/services/emailService.js');

const statsBase = {
  totalLeads: 10,
  leadsPorClassificacao: { QUENTE: 3, MORNO: 4, FRIO: 3 },
  lastWebhookAt: '2026-06-20T12:00:00.000Z',
  uptimeSeconds: 3661,
};

const leadBase = {
  name: 'João Silva',
  email: 'joao@empresa.com',
  classificacao: 'QUENTE',
  lead_score: 80,
  segmento: 'Agro',
  company_name: 'Empresa SA',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sendHeartbeatEmail', () => {
  test('chama sendMail com assunto correto', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'abc' });
    await sendHeartbeatEmail(statsBase);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.subject).toContain('Heartbeat');
    expect(call.subject).toContain('10 leads');
  });

  test('corpo do e-mail contém totais por classificação', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'abc' });
    await sendHeartbeatEmail(statsBase);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.text).toContain('QUENTE');
    expect(call.text).toContain('MORNO');
    expect(call.text).toContain('FRIO');
    expect(call.text).toContain('10');
  });

  test('corpo contém uptime formatado', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'abc' });
    await sendHeartbeatEmail(statsBase);
    const call = mockSendMail.mock.calls[0][0];
    // 3661s = 1h 1m 1s
    expect(call.text).toContain('1h 1m 1s');
  });

  test('erro no sendMail não propaga exceção', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP offline'));
    await expect(sendHeartbeatEmail(statsBase)).resolves.toBeUndefined();
  });

  test('lastWebhookAt null → exibe mensagem alternativa', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'abc' });
    await sendHeartbeatEmail({ ...statsBase, lastWebhookAt: null });
    const call = mockSendMail.mock.calls[0][0];
    expect(call.text).toContain('Nenhum webhook recebido ainda');
  });
});

describe('sendNewLeadEmail', () => {
  test('chama sendMail com assunto contendo nome do lead', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'xyz' });
    await sendNewLeadEmail(leadBase);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.subject).toContain('João Silva');
  });

  test('corpo contém email, classificacao e score', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'xyz' });
    await sendNewLeadEmail(leadBase);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.text).toContain('joao@empresa.com');
    expect(call.text).toContain('QUENTE');
    expect(call.text).toContain('80');
  });

  test('erro no sendMail não propaga exceção', async () => {
    mockSendMail.mockRejectedValue(new Error('Conexão recusada'));
    await expect(sendNewLeadEmail(leadBase)).resolves.toBeUndefined();
  });

  test('lead sem nome usa email no assunto', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'xyz' });
    await sendNewLeadEmail({ ...leadBase, name: null });
    const call = mockSendMail.mock.calls[0][0];
    expect(call.subject).toContain('joao@empresa.com');
  });
});
