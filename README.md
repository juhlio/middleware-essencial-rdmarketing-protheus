# Middleware RD Station Marketing → Protheus

Recebe leads do **RD Station Marketing** via webhook, salva no PostgreSQL com classificação QUENTE/MORNO/FRIO por score, e expõe endpoints REST para o Protheus (ERP) consultar.

## Arquitetura

```
RD Station Marketing
  └── Webhook (POST /api/webhook/rd-station)
        └── Node.js / Express
              └── PostgreSQL
                    └── Endpoints REST
                          └── Protheus (ERP)
```

- **Entrada**: RD Station empurra cada lead convertido via webhook
- **Classificação**: QUENTE (score ≥ 70) · MORNO (score ≥ 40) · FRIO (< 40)
- **Saída**: GET /api/leads para o Protheus consultar quando precisar

---

## Pré-requisitos

- Docker e Docker Compose
- Conta no RD Station Marketing com acesso ao App Publisher

---

## Configuração

### 1. Cadastrar app no RD Station App Publisher

1. Acesse [app.rdstation.com.br/integracoes/publisher](https://app.rdstation.com.br/integracoes/publisher)
2. Crie um novo app e anote o **Client ID** e **Client Secret**
3. Adicione a URL de callback: `http://SEU_SERVIDOR:3000/api/auth/callback`

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env`:

```env
RD_STATION_CLIENT_ID=seu_client_id
RD_STATION_CLIENT_SECRET=seu_client_secret
RD_STATION_REDIRECT_URI=http://SEU_SERVIDOR:3000/api/auth/callback

DB_HOST=postgres
DB_USER=middleware_user
DB_PASSWORD=senha_segura
DB_NAME=rd_station_middleware

WEBHOOK_SECRET=chave_secreta_para_validar_webhook
```

### 3. Subir os containers

```bash
docker compose up -d
```

### 4. Autorizar o OAuth2 (uma vez)

Abra no navegador:
```
http://SEU_SERVIDOR:3000/api/auth/rd-station
```

Faça login no RD Station quando solicitado. O token é salvo automaticamente no banco e renovado antes de expirar.

Verifique se está autorizado:
```bash
curl http://SEU_SERVIDOR:3000/api/auth/status
```

### 5. Configurar webhook no RD Station

1. Acesse **app.rdstation.com.br → Configurações → Integrações → Webhooks**
2. Crie um webhook com:
   - **URL**: `http://SEU_SERVIDOR:3000/api/webhook/rd-station?auth_token=WEBHOOK_SECRET`
   - **Gatilho**: Conversão
3. Clique em **Verificar** para testar

---

## Endpoints

> **🔒 Autenticação**: os endpoints marcados com 🔒 exigem o header
> `Authorization: Bearer <PROTHEUS_API_KEY>` ou `X-API-Key: <PROTHEUS_API_KEY>`.

### Leads (🔒 requer API key)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/leads` | Lista todos os leads (paginado) |
| GET | `/api/leads?classificacao=QUENTE` | Filtra por classificação |
| GET | `/api/leads?segmento=Agro` | Filtra por segmento |
| GET | `/api/leads/classificacao/QUENTE` | Leads quentes |
| GET | `/api/leads/classificacao/MORNO` | Leads mornos |
| GET | `/api/leads/classificacao/FRIO` | Leads frios |
| GET | `/api/leads/:id` | Lead por ID |
| GET | `/api/status` 🔒 | Modo de sync e último webhook recebido |

### Sistema (aberto)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/health` | Status do serviço — aberto para healthcheck do Docker |
| GET | `/api/auth/rd-station` | Inicia fluxo OAuth2 com RD Station |
| GET | `/api/auth/callback` | Callback OAuth2 (uso interno) |
| GET | `/api/auth/status` | Verifica se OAuth2 está autorizado |
| POST | `/api/webhook/rd-station` | Recebe eventos do RD Station (protegido por WEBHOOK_SECRET) |

### Exemplo de chamada autenticada

```bash
curl -H "Authorization: Bearer sua_chave" http://SEU_SERVIDOR:3000/api/leads
# ou
curl -H "X-API-Key: sua_chave" http://SEU_SERVIDOR:3000/api/leads
```

### Parâmetros de paginação

```
GET /api/leads?limit=50&offset=0
GET /api/leads?classificacao=QUENTE&limit=20
```

---

## Campos dos leads

| Campo | Origem no RD Station |
|-------|----------------------|
| `email` | email |
| `name` | name |
| `phone` | personal_phone / mobile_phone |
| `cnpj_cpf` | custom_fields.cpf_cnpj |
| `company_name` | company_name |
| `city` / `state` | city / state |
| `segmento` | custom_fields.segmento |
| `potencia` | custom_fields.potencia / potencia_kva |
| `tipo_combustivel` | custom_fields.tipo_combustivel |
| `periodo_locacao` | custom_fields.periodo_locacao |
| `aplicacao` | custom_fields.aplicacao |
| `origem_formulario` | conversion_identifier do formulário |
| `lead_score` | lead_score |
| `classificacao` | calculado (QUENTE/MORNO/FRIO) |
| `tags` | tags[] |
| `status_oportunidade` | OPORTUNIDADE quando opportunity=true |

---

## Desenvolvimento local com ngrok

Para testar webhooks localmente:

```bash
# Terminal 1 — sobe os containers
docker compose up -d

# Terminal 2 — expõe a porta para a internet
ngrok http 3000
```

Use a URL do ngrok (`.ngrok-free.dev`) na configuração do webhook no RD Station.

---

## Comandos úteis

```bash
make up-d        # sobe em background
make logs        # logs em tempo real
make down        # derruba tudo
make build       # rebuild da imagem
make db-shell    # acessa o PostgreSQL
```
