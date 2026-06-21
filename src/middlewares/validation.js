const CLASSIFICACOES = ['QUENTE', 'MORNO', 'FRIO'];

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: message });
}

// -------------------------------------------------------------------
// GET /api/leads — query params
// -------------------------------------------------------------------
export function validateQueryParams(req, res, next) {
  const { limit, offset, classificacao, segmento } = req.query;

  if (limit !== undefined) {
    const n = Number(limit);
    if (!Number.isInteger(n) || n < 1 || n > 1000) {
      return badRequest(res, 'limit deve ser um inteiro entre 1 e 1000');
    }
  }

  if (offset !== undefined) {
    const n = Number(offset);
    if (!Number.isInteger(n) || n < 0) {
      return badRequest(res, 'offset deve ser um inteiro maior ou igual a 0');
    }
  }

  if (classificacao !== undefined) {
    if (!CLASSIFICACOES.includes(classificacao.toUpperCase())) {
      return badRequest(
        res,
        `classificacao inválida — valores aceitos: ${CLASSIFICACOES.join(', ')}`
      );
    }
    req.query.classificacao = classificacao.toUpperCase();
  }

  if (segmento !== undefined) {
    const s = segmento.trim();
    if (!s || s.length > 100) {
      return badRequest(res, 'segmento deve ter entre 1 e 100 caracteres');
    }
    req.query.segmento = s;
  }

  next();
}

// -------------------------------------------------------------------
// GET /api/leads/:id
// -------------------------------------------------------------------
export function validateId(req, res, next) {
  const n = Number(req.params.id);

  if (!Number.isInteger(n) || n < 1) {
    return badRequest(res, 'id deve ser um inteiro maior que 0');
  }

  next();
}

// -------------------------------------------------------------------
// GET /api/leads/classificacao/:tipo
// -------------------------------------------------------------------
export function validateClassificacao(req, res, next) {
  const tipo = req.params.tipo?.toUpperCase();

  if (!CLASSIFICACOES.includes(tipo)) {
    return badRequest(
      res,
      `Classificação inválida — valores aceitos: ${CLASSIFICACOES.join(', ')}`
    );
  }

  req.params.tipo = tipo;
  next();
}
