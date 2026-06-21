import { pool } from '../config/database.js';

// -------------------------------------------------------------------
// Inicialização
// -------------------------------------------------------------------
export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.info('[db] Conexão com o banco estabelecida com sucesso');
  } finally {
    client.release();
  }
}

export async function createTablesIfNotExist() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id                  SERIAL PRIMARY KEY,
      rd_id               BIGINT UNIQUE,
      uuid                VARCHAR(255),
      name                VARCHAR(255),
      email               VARCHAR(255) UNIQUE NOT NULL,
      phone               VARCHAR(20),
      cnpj_cpf            VARCHAR(20),
      company_name        VARCHAR(255),
      city                VARCHAR(100),
      state               VARCHAR(2),
      segmento            VARCHAR(100),
      potencia            VARCHAR(50),
      tipo_combustivel    VARCHAR(50),
      periodo_locacao     VARCHAR(255),
      aplicacao           VARCHAR(100),
      origem_formulario   VARCHAR(100),
      lead_score          INTEGER DEFAULT 0,
      classificacao       VARCHAR(20),
      tags                TEXT[],
      status_oportunidade VARCHAR(50),
      created_at          TIMESTAMP,
      updated_at          TIMESTAMP,
      data_sincronismo    TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key        VARCHAR(100) PRIMARY KEY,
      value      TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_leads_classificacao ON leads (classificacao)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_leads_segmento ON leads (segmento)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email)
  `);

  console.info('[db] Tabelas e índices verificados');
}

// -------------------------------------------------------------------
// Upsert (insert ou update por email)
// -------------------------------------------------------------------
export async function insertOrUpdateLead(lead) {
  const {
    rd_id, uuid, name, email, phone, cnpj_cpf, company_name,
    city, state, segmento, potencia, tipo_combustivel, periodo_locacao,
    aplicacao, origem_formulario, lead_score, classificacao, tags,
    status_oportunidade, created_at, updated_at,
  } = lead;

  const { rows } = await pool.query(
    `INSERT INTO leads
       (rd_id, uuid, name, email, phone, cnpj_cpf, company_name,
        city, state, segmento, potencia, tipo_combustivel, periodo_locacao,
        aplicacao, origem_formulario, lead_score, classificacao, tags,
        status_oportunidade, created_at, updated_at, data_sincronismo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
     ON CONFLICT (email) DO UPDATE SET
       rd_id               = EXCLUDED.rd_id,
       uuid                = EXCLUDED.uuid,
       name                = EXCLUDED.name,
       phone               = EXCLUDED.phone,
       cnpj_cpf            = EXCLUDED.cnpj_cpf,
       company_name        = EXCLUDED.company_name,
       city                = EXCLUDED.city,
       state               = EXCLUDED.state,
       segmento            = EXCLUDED.segmento,
       potencia            = EXCLUDED.potencia,
       tipo_combustivel    = EXCLUDED.tipo_combustivel,
       periodo_locacao     = EXCLUDED.periodo_locacao,
       aplicacao           = EXCLUDED.aplicacao,
       origem_formulario   = EXCLUDED.origem_formulario,
       lead_score          = EXCLUDED.lead_score,
       classificacao       = EXCLUDED.classificacao,
       tags                = EXCLUDED.tags,
       status_oportunidade = EXCLUDED.status_oportunidade,
       updated_at          = EXCLUDED.updated_at,
       data_sincronismo    = NOW()
     RETURNING *`,
    [
      rd_id, uuid, name, email, phone, cnpj_cpf, company_name,
      city, state, segmento, potencia, tipo_combustivel, periodo_locacao,
      aplicacao, origem_formulario, lead_score, classificacao, tags ?? null,
      status_oportunidade, created_at ?? null, updated_at ?? null,
    ]
  );

  return rows[0];
}

// -------------------------------------------------------------------
// Upsert em lote dentro de uma única transação
// -------------------------------------------------------------------
export async function bulkUpsertLeads(leads) {
  if (leads.length === 0) return 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const lead of leads) {
      await insertOrUpdateLead(lead);
    }
    await client.query('COMMIT');
    return leads.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// -------------------------------------------------------------------
// Queries
// -------------------------------------------------------------------
export async function getAllLeads({ classificacao, segmento, limit = 100, offset = 0 } = {}) {
  const params = [];
  const conditions = [];

  if (classificacao) {
    params.push(classificacao.toUpperCase());
    conditions.push(`classificacao = $${params.length}`);
  }

  if (segmento) {
    params.push(`%${segmento}%`);
    conditions.push(`segmento ILIKE $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM leads ${where}`,
    params
  );

  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT * FROM leads ${where}
     ORDER BY lead_score DESC, data_sincronismo DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { data: rows, total: countRows[0].total };
}

export async function getLeadById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM leads WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function getLeadsByClassificacao(tipo) {
  const { rows } = await pool.query(
    'SELECT * FROM leads WHERE classificacao = $1 ORDER BY lead_score DESC',
    [tipo.toUpperCase()]
  );
  return { data: rows, total: rows.length };
}

export async function getLeadsBySegmento(segmento) {
  const { rows } = await pool.query(
    'SELECT * FROM leads WHERE segmento ILIKE $1 ORDER BY lead_score DESC',
    [`%${segmento}%`]
  );
  return { data: rows, total: rows.length };
}

export async function countLeads() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM leads');
  return rows[0].total;
}

// -------------------------------------------------------------------
// Shutdown
// -------------------------------------------------------------------
export async function closePool() {
  await pool.end();
  console.info('[db] Pool de conexões encerrado');
}
