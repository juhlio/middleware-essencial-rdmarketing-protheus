import { jest } from '@jest/globals';

// Mocks antes de qualquer import dos módulos sob teste
const mockProcessWebhookPayload = jest.fn();
const mockWebhookSecret = {
  default: {
    server: { nodeEnv: 'test' },
    webhook: { secret: '' },
  },
};

jest.unstable_mockModule('../src/services/leadService.js', () => ({
  processWebhookPayload: mockProcessWebhookPayload,
}));

jest.unstable_mockModule('../src/config/index.js', () => mockWebhookSecret);

// Imports dinâmicos após mocks registrados
const { default: express } = await import('express');
const { default: webhookRoutes } = await import('../src/routes/webhookRoutes.js');
const { default: supertest } = await import('supertest');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/webhook', webhookRoutes);
  return app;
}

const rdPayload = {
  leads: [{
    id: '4827859840',
    email: 'test@test.com',
    name: 'Test Lead',
    lead_score: 75,
    custom_fields: {},
    tags: [],
  }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockWebhookSecret.default.webhook.secret = '';
});

describe('POST /api/webhook/rd-station — sem token configurado', () => {
  test('payload válido (leads[]) → 200 com email e classificacao', async () => {
    mockProcessWebhookPayload.mockResolvedValue({
      event_type: 'WEBHOOK.CONVERTED',
      email: 'test@test.com',
      classificacao: 'QUENTE',
      lead_id: 1,
    });

    const res = await supertest(buildApp())
      .post('/api/webhook/rd-station')
      .send(rdPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.email).toBe('test@test.com');
    expect(res.body.classificacao).toBe('QUENTE');
  });

  test('payload sem email (400 do service) → retorna 200 com received', async () => {
    mockProcessWebhookPayload.mockRejectedValue(
      Object.assign(new Error('Payload sem email'), { status: 400 })
    );

    const res = await supertest(buildApp())
      .post('/api/webhook/rd-station')
      .send({ leads: [{ name: 'Sem Email' }] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'received' });
  });

  test('formato não reconhecido (400 do service) → retorna 200 com received', async () => {
    mockProcessWebhookPayload.mockRejectedValue(
      Object.assign(new Error('Payload inválido'), { status: 400 })
    );

    const res = await supertest(buildApp())
      .post('/api/webhook/rd-station')
      .send({ foo: 'bar' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('received');
  });

  test('erro interno do service (500) → propaga como 500', async () => {
    mockProcessWebhookPayload.mockRejectedValue(new Error('DB offline'));

    const app = buildApp();
    // Adiciona error handler básico
    app.use((err, req, res, _next) => res.status(500).json({ error: err.message }));

    const res = await supertest(app)
      .post('/api/webhook/rd-station')
      .send(rdPayload);

    expect(res.status).toBe(500);
  });
});

describe('POST /api/webhook/rd-station — com WEBHOOK_SECRET configurado', () => {
  beforeEach(() => {
    mockWebhookSecret.default.webhook.secret = 'segredo123';
  });

  test('token correto via query → 200', async () => {
    mockProcessWebhookPayload.mockResolvedValue({
      event_type: 'WEBHOOK.CONVERTED',
      email: 'test@test.com',
      classificacao: 'FRIO',
      lead_id: 2,
    });

    const res = await supertest(buildApp())
      .post('/api/webhook/rd-station?auth_token=segredo123')
      .send(rdPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('token correto via header → 200', async () => {
    mockProcessWebhookPayload.mockResolvedValue({
      event_type: 'WEBHOOK.CONVERTED',
      email: 'test@test.com',
      classificacao: 'MORNO',
      lead_id: 3,
    });

    const res = await supertest(buildApp())
      .post('/api/webhook/rd-station')
      .set('x-webhook-token', 'segredo123')
      .send(rdPayload);

    expect(res.status).toBe(200);
  });

  test('token errado → 401', async () => {
    const res = await supertest(buildApp())
      .post('/api/webhook/rd-station?auth_token=errado')
      .send(rdPayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('sem token → 401', async () => {
    const res = await supertest(buildApp())
      .post('/api/webhook/rd-station')
      .send(rdPayload);

    expect(res.status).toBe(401);
  });
});
