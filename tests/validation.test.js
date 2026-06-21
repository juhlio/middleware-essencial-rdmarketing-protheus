import { jest } from '@jest/globals';
import {
  validateQueryParams,
  validateId,
  validateClassificacao,
} from '../src/middlewares/validation.js';

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validateQueryParams', () => {
  test('sem params → next() chamado', () => {
    const next = jest.fn();
    validateQueryParams({ query: {} }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('limit válido → next()', () => {
    const next = jest.fn();
    validateQueryParams({ query: { limit: '50' } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('limit 0 → 400', () => {
    const res = mockRes();
    validateQueryParams({ query: { limit: '0' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('limit 1001 → 400', () => {
    const res = mockRes();
    validateQueryParams({ query: { limit: '1001' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('offset negativo → 400', () => {
    const res = mockRes();
    validateQueryParams({ query: { offset: '-1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('classificacao válida normalizada para uppercase', () => {
    const req = { query: { classificacao: 'quente' } };
    const next = jest.fn();
    validateQueryParams(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.query.classificacao).toBe('QUENTE');
  });

  test('classificacao inválida → 400', () => {
    const res = mockRes();
    validateQueryParams({ query: { classificacao: 'INVALIDO' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('segmento vazio → 400', () => {
    const res = mockRes();
    validateQueryParams({ query: { segmento: '   ' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('validateId', () => {
  test('id inteiro positivo → next()', () => {
    const next = jest.fn();
    validateId({ params: { id: '5' } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('id 0 → 400', () => {
    const res = mockRes();
    validateId({ params: { id: '0' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('id negativo → 400', () => {
    const res = mockRes();
    validateId({ params: { id: '-1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('id texto → 400', () => {
    const res = mockRes();
    validateId({ params: { id: 'abc' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('validateClassificacao', () => {
  test('QUENTE → next()', () => {
    const req = { params: { tipo: 'QUENTE' } };
    const next = jest.fn();
    validateClassificacao(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('morno (minúsculo) → normaliza e next()', () => {
    const req = { params: { tipo: 'morno' } };
    const next = jest.fn();
    validateClassificacao(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.params.tipo).toBe('MORNO');
  });

  test('valor inválido → 400', () => {
    const res = mockRes();
    validateClassificacao({ params: { tipo: 'TEPIDO' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
