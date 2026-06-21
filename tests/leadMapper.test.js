import { mapRDContactToLead, classificarLead } from '../src/utils/leadMapper.js';

describe('classificarLead', () => {
  test('score >= 70 → QUENTE', () => expect(classificarLead(70)).toBe('QUENTE'));
  test('score >= 40 → MORNO', () => expect(classificarLead(40)).toBe('MORNO'));
  test('score < 40  → FRIO',  () => expect(classificarLead(39)).toBe('FRIO'));
  test('score 0     → FRIO',  () => expect(classificarLead(0)).toBe('FRIO'));
  test('score 100   → QUENTE',() => expect(classificarLead(100)).toBe('QUENTE'));
});

describe('mapRDContactToLead — formato real do webhook RD Station (leads[])', () => {
  const base = {
    id: '4827859840',
    uuid: 'abc-123',
    name: 'Jordan Oliveira',
    email: 'jordan@jcsr.com.br',
    personal_phone: '(11) 97208-3773',
    city: 'São Paulo',
    state: 'SP',
    tags: ['whatsapp', 'venda'],
    lead_score: 0,
    opportunity: 'false',
    custom_fields: { cpf_cnpj: '33291138805', potencia_kva: 'Acima de 300 kVA' },
    first_conversion: { content: { conversion_identifier: 'whatsapp-bot-essencial' } },
  };

  test('email e nome mapeados corretamente', () => {
    const lead = mapRDContactToLead(base);
    expect(lead.email).toBe('jordan@jcsr.com.br');
    expect(lead.name).toBe('Jordan Oliveira');
  });

  test('telefone vem de personal_phone', () => {
    expect(mapRDContactToLead(base).phone).toBe('(11) 97208-3773');
  });

  test('fallback para mobile_phone quando personal_phone ausente', () => {
    const c = { ...base, personal_phone: null, mobile_phone: '(11) 91111-2222' };
    expect(mapRDContactToLead(c).phone).toBe('(11) 91111-2222');
  });

  test('custom_fields sem prefixo cf_ — cpf_cnpj e potencia_kva', () => {
    const lead = mapRDContactToLead(base);
    expect(lead.cnpj_cpf).toBe('33291138805');
    expect(lead.potencia).toBe('Acima de 300 kVA');
  });

  test('rd_id como BIGINT (Number grande)', () => {
    expect(mapRDContactToLead(base).rd_id).toBe(4827859840);
  });

  test('opportunity "false" (string) → status_oportunidade null', () => {
    expect(mapRDContactToLead(base).status_oportunidade).toBeNull();
  });

  test('opportunity "true" (string) → OPORTUNIDADE', () => {
    expect(mapRDContactToLead({ ...base, opportunity: 'true' }).status_oportunidade)
      .toBe('OPORTUNIDADE');
  });

  test('opportunity true (boolean) → OPORTUNIDADE', () => {
    expect(mapRDContactToLead({ ...base, opportunity: true }).status_oportunidade)
      .toBe('OPORTUNIDADE');
  });

  test('lead_score 0 → FRIO', () => {
    const lead = mapRDContactToLead(base);
    expect(lead.classificacao).toBe('FRIO');
    expect(lead.lead_score).toBe(0);
  });
});

describe('mapRDContactToLead — formato com prefixo cf_ no top-level', () => {
  const contact = {
    email: 'top@level.com',
    name: 'Top Level',
    lead_score: 75,
    cf_segmento: 'Agronegócio',
    cf_potencia: '100kVA',
    cf_tipo_combustivel: 'Diesel',
  };

  test('campos cf_ top-level mapeados corretamente', () => {
    const lead = mapRDContactToLead(contact);
    expect(lead.segmento).toBe('Agronegócio');
    expect(lead.potencia).toBe('100kVA');
    expect(lead.tipo_combustivel).toBe('Diesel');
    expect(lead.classificacao).toBe('QUENTE');
  });
});

describe('mapRDContactToLead — custom_fields como array (formato API individual)', () => {
  const contact = {
    email: 'array@format.com',
    lead_score: 50,
    custom_fields: [
      { cf_key: 'segmento', value: 'Mineração' },
      { cf_key: 'periodo_locacao', value: '12 meses' },
    ],
  };

  test('array de custom_fields mapeado corretamente', () => {
    const lead = mapRDContactToLead(contact);
    expect(lead.segmento).toBe('Mineração');
    expect(lead.periodo_locacao).toBe('12 meses');
    expect(lead.classificacao).toBe('MORNO');
  });
});

describe('mapRDContactToLead — campos ausentes', () => {
  test('email null quando ausente', () => {
    expect(mapRDContactToLead({}).email).toBeNull();
  });

  test('rd_id null quando id ausente', () => {
    expect(mapRDContactToLead({}).rd_id).toBeNull();
  });

  test('classificacao FRIO quando lead_score ausente', () => {
    expect(mapRDContactToLead({}).classificacao).toBe('FRIO');
  });
});
