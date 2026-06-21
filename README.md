# RD Station → Protheus Middleware

API REST que sincroniza leads do RD Station CRM com o banco de dados local, classifica os contatos por score (QUENTE / MORNO / FRIO) e expõe endpoints para consulta e integração com o Protheus.

---

## Arquitetura

```
┌─────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
│  RD Station CRM │──────▶ │  Node.js Middleware   │──────▶ │   PostgreSQL     │
│  (API REST)     │  sync  │  (Express + node-cron)│  upsert│   (leads)        │
└─────────────────┘        └──────────────────────┘        └─────────────────┘
                                      │
                                      ▼ REST API
                           ┌──────────────────────┐
                           │  Protheus / Clientes  │
                           └──────────────────────┘
```

---

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) >= 24
- [Docker Compose](https://docs.docker.com/compose/) >= 2 (já incluso no Docker Desktop)
- `make` (Linux/macOS nativo; Windows via WSL ou Git Bash)

---

## Quick Start

```bash
# 1. Clone o repositório
git clone <url-do-repo>
cd rest-leads-essencial

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com seu RD_STATION_TOKEN e credenciais do banco

# 3. Build das imagens
make build

# 4. Inicie os containers
make up-d

# 5. Verifique que está no ar
curl http://localhost:3000/api/health
```

---

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Status da aplicação e última sincronização |
| `GET` | `/api/status` | Próxima sincronização em segundos |
| `GET` | `/api/leads` | Lista leads com filtros e paginação |
| `GET` | `/api/leads/:id` | Busca lead por ID |
| `GET` | `/api/leads/classificacao/:tipo` | Lista leads por classificação (QUENTE, MORNO, FRIO) |
| `POST` | `/api/sync` | Dispara sincronização manual imediata |

### Query params — `GET /api/leads`

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `limit` | number | 100 | Itens por página (máx. 1000) |
| `offset` | number | 0 | Registros a pular |
| `classificacao` | string | — | QUENTE, MORNO ou FRIO |
| `segmento` | string | — | Filtro parcial por segmento |

---

## Desenvolvimento

```bash
make logs          # logs do middleware em tempo real
make test          # roda Jest dentro do container
make lint          # ESLint em src/
make format        # Prettier em src/
make shell         # shell dentro do container
make db-shell      # psql no banco de dados
make restart       # reinicia só o middleware
make clean         # derruba containers e apaga volumes
```

---

## Estrutura de pastas

```
src/
├── config/
│   ├── index.js          # carrega e valida variáveis de ambiente
│   └── database.js       # pool PostgreSQL
├── controllers/
│   └── index.js          # handlers HTTP
├── middlewares/
│   ├── index.js          # barrel de exports
│   ├── errorHandler.js   # errorHandler, notFoundHandler, asyncHandler
│   └── validation.js     # validação de query params e path params
├── routes/
│   └── index.js          # definição de todas as rotas
├── services/
│   ├── databaseService.js # CRUD e inicialização do banco
│   ├── leadService.js     # lógica de negócio e mapeamento de leads
│   └── rdStationService.js# integração com a API do RD Station
└── utils/
    └── cronSync.js        # agendamento da sincronização periódica
tests/                     # testes Jest
docker/                    # arquivos auxiliares Docker
```

---

## Contribuindo

1. Crie uma branch a partir de `main`: `git checkout -b feat/minha-feature`
2. Faça as alterações e rode `make lint` e `make test`
3. Abra um Pull Request descrevendo o que foi alterado e por quê

---

## Licença

Privado — uso interno.
