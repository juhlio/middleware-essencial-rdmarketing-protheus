// Módulo puro — sem imports com efeitos colaterais (sem DB, sem config)

export function classificarLead(score) {
  if (score >= 70) return 'QUENTE';
  if (score >= 40) return 'MORNO';
  return 'FRIO';
}

export function mapRDContactToLead(contact) {
  const score = Number(contact.lead_score ?? 0);

  // Custom fields chegam como objeto sem prefixo cf_ no webhook real do RD Station:
  // { cpf_cnpj: "...", potencia_kva: "..." }
  // Também pode vir como array [{ cf_key, value }] ou com prefixo cf_ no top-level
  const cfBase = Array.isArray(contact.custom_fields)
    ? Object.fromEntries(contact.custom_fields.map((f) => [f.cf_key ?? f.key, f.value]))
    : (contact.custom_fields ?? {});
  const cfTopLevel = Object.fromEntries(
    Object.entries(contact).filter(([k]) => k.startsWith('cf_'))
  );
  const cf = { ...cfBase, ...cfTopLevel };

  // opportunity pode vir como boolean ou string "false"/"true"
  const isOpportunity = contact.opportunity === true || contact.opportunity === 'true';

  return {
    rd_id:              contact.id ? Number(contact.id) : null,
    uuid:               contact.uuid ?? null,
    name:               contact.name ?? null,
    email:              contact.email ?? null,
    phone:              contact.personal_phone ?? contact.mobile_phone ?? contact.phone ?? null,
    cnpj_cpf:           cf.cf_cnpj_cpf ?? cf.cnpj_cpf ?? cf.cpf_cnpj ?? null,
    company_name:       contact.company_name ?? contact.company ?? null,
    city:               contact.city ?? null,
    state:              contact.state ?? null,
    segmento:           cf.cf_segmento ?? cf.segmento ?? null,
    potencia:           cf.cf_potencia ?? cf.potencia ?? cf.potencia_kva ?? null,
    tipo_combustivel:   cf.cf_tipo_combustivel ?? cf.tipo_combustivel ?? null,
    periodo_locacao:    cf.cf_periodo_locacao ?? cf.periodo_locacao ?? null,
    aplicacao:          cf.cf_aplicacao ?? cf.aplicacao ?? null,
    origem_formulario:  contact.traffic_source ?? cf.cf_origem_formulario ?? null,
    lead_score:         score,
    classificacao:      classificarLead(score),
    tags:               contact.tags ?? null,
    status_oportunidade: isOpportunity ? 'OPORTUNIDADE' : null,
    created_at:         contact.created_at ?? null,
    updated_at:         contact.updated_at ?? null,
  };
}
