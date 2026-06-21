import { jest } from '@jest/globals';

const VALID_KEY = 'chave-secreta-de-teste';

jest.unstable_mockModule('../src/config/index.js', () => ({
  default: {
    server: { nodeEnv: 'test' },
    protheus: { apiKey: VALID_KEY },
    webhook: { secret: '' },
  },
}));

const { apiKeyAuth } = await import('../src/middlewares/apiKeyAuth.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(headers = {}) {
  return { headers };
}

describe('apiKeyAuth', () => {
  test('sem nenhum header → 401', () => {
    const res = mockRes();
    apiKeyAuth(makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'API key ausente ou inválida' });
  });

  test('Authorization Bearer errado → 401', () => {
    const res = mockRes();
    apiKeyAuth(makeReq({ authorization: 'Bearer chave-errada' }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('X-API-Key errado → 401', () => {
    const res = mockRes();
    apiKeyAuth(makeReq({ 'x-api-key': 'nope' }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('Authorization Bearer vazio → 401', () => {
    const res = mockRes();
    apiKeyAuth(makeReq({ authorization: 'Bearer ' }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('Authorization Bearer correto → next() chamado', () => {
    const next = jest.fn();
    apiKeyAuth(makeReq({ authorization: `Bearer ${VALID_KEY}` }), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('X-API-Key correto → next() chamado', () => {
    const next = jest.fn();
    apiKeyAuth(makeReq({ 'x-api-key': VALID_KEY }), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('Authorization tem prioridade sobre X-API-Key', () => {
    const next = jest.fn();
    apiKeyAuth(
      makeReq({ authorization: `Bearer ${VALID_KEY}`, 'x-api-key': 'errado' }),
      mockRes(),
      next
    );
    expect(next).toHaveBeenCalled();
  });

  test('Authorization Bearer correto não chama res.status', () => {
    const res = mockRes();
    const next = jest.fn();
    apiKeyAuth(makeReq({ authorization: `Bearer ${VALID_KEY}` }), res, next);
    expect(res.status).not.toHaveBeenCalled();
  });
});
