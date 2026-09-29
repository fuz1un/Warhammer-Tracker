# ⚙ WH40K — Biblioteca Imperial

Rastreador de livros Black Library com alertas de stock por email e Discord.

Este projeto combina:
- monitorização de stock e pré-encomendas
- catálogo de livros
- novas edições e releases
- lista de acompanhamento (watchlist)
- futuro suporte para coleção, séries e leitura

## Estado do projeto

### Milestones concluídos
- [x] Estrutura base do servidor em Node.js
- [x] Serviço de frontend estático em `/`
- [x] API de livros e estado de stock
- [x] Watcher de livros vigiados com notificações por email e Discord
- [x] Normalização de disponibilidade e transições de estado
- [x] Melhoria da camada de catálogo com metadata mais rica
- [x] Endpoints de catálogo e releases (`/catalog`, `/releases`)
- [x] Sanitização de URLs e mascaramento de segredos em logs
- [x] Testes iniciais para estados de stock e normalização

### Milestones em progresso
- [x] Interface de “New Releases” / “Upcoming”
- [x] Painel de detalhes do livro
- [x] Agrupamento por série / autor / leitura
- [ ] Coleção, wishlist e histórico pessoal
- [ ] Fluxo de reportar livro em falta ou corrigir metadata
- [ ] Smoke tests finais e validação integrada

---

## Visão geral da arquitectura

### Backend
Localização principal:
- `watcher/server.js`

Responsabilidades:
- servir o frontend
- consultar Algolia para os livros
- normalizar estado de stock
- detectar transições de disponibilidade
- enviar emails e Discord
- guardar estado local em `data/state.json`
- fornecer endpoints de catálogo e releases

### Frontend
Localização principal:
- `watcher/index.html`

Responsabilidades:
- mostrar todos os livros
- mostrar pré-encomendas
- mostrar livros vigiados
- filtros por idioma, formato, estado e pesquisa
- futura UI de “new releases” e detalhes do livro

---

## TODO / Roadmap

### Fase 1 — Base do catálogo
- [x] Definir modelo de dados do catálogo
- [x] Adicionar metadata rica ao modelo de livro
- [x] Adicionar endpoints de catálogo e releases
- [x] Sanitizar URLs e proteger logs
- [ ] Expor filtros mais ricos no frontend (`series`, `author`, `releaseDate`, etc.)

### Fase 2 — Releases e descoberta
- [x] Criar tab “New releases”
- [ ] Criar tab “Upcoming”
- [x] Ordenar por data e mostrar próximos lançamentos
- [ ] Mostrar meses / grupos por data de lançamento
- [ ] Adicionar paginação ou carregamento incremental

### Fase 3 — Detalhes do livro
- [x] Criar painel modal/side panel para cada livro
- [x] Mostrar resumo, autor, série, formato, data de lançamento
- [x] Mostrar relação com autores e séries
- [ ] Mostrar histórico de disponibilidade do livro

### Fase 4 — Séries e leitura
- [x] Agrupar por `series`
- [ ] Página por série
- [ ] Página por autor
- [x] Ordenação por leitura / cronologia

### Fase 5 — Coleção e wishlist
- [ ] Listas pessoais: owned / read / wishlist
- [ ] Persistência em ficheiro de estado local
- [ ] Marcação rápida por interface

### Fase 6 — Qualidade e segurança
- [ ] Revisão de inputs e validação do payload de API
- [ ] Melhor tratamento de erros e fallbacks
- [ ] Proteção adicional para acesso futuro global
- [ ] Limitar exposição de dados sensíveis em logs e respostas
- [ ] Revisão de CORS e headers HTTP em cenário global

### Fase 7 — Operações e manutenção
- [ ] Testes de regressão para stock e release metadata
- [ ] Validação de endpoints com smoke tests
- [ ] Documentação de deploy e configuration
- [ ] Preparação para multi-tenant / uso global

---

## Regras de desenvolvimento

### Segurança
- Nunca logar secrets e API keys em texto plano
- Usar mascaramento para valores sensíveis
- Validar todas as URLs externas antes de as usar
- Evitar `javascript:` / `data:` / `vbscript:` em links
- Manter configurações locais e sensíveis fora do frontend

### Boas práticas
- Fazer mudanças pequenas e verificáveis
- Adicionar testes para regressões em regras de negócio
- Manter watcher e catálogo separados logicamente
- Priorizar compatibilidade com o uso pessoal antes de abrir ao público

---

## Como verificar o estado local

```bash
# No diretório do projeto
node --test watcher/test/availability.test.js
```

Se o ambiente tiver Node disponível, este comando deve validar as regras de normalização e transição de estado.

---

## Commits úteis

Mensagem curta e precisa usada habitualmente:
- `feat: add catalog metadata and release endpoints`
- `fix: sanitize urls and mask secrets in logs`
- `chore: update roadmap and milestones`

---

## Próximo passo recomendado

Implementar a interface de “New Releases / Upcoming” e depois o painel de detalhes do livro, mantendo a lógica de watchlist intacta.

## Quick setup

1. Copy the config file:

```bash
cp watcher/config.example.json watcher/config.json
```

2. Edit `watcher/config.json`:

```json
{
  "emailEnabled": true,
  "emailUser": "your@gmail.com",
  "emailPass": "xxxx xxxx xxxx xxxx",
  "emailTo": "your@gmail.com",
  "discordEnabled": true,
  "discordWebhook": "https://discord.com/api/webhooks/..."
}
```

3. Start it:

```bash
docker compose up -d
```

4. Open `http://localhost:8080`

## How to get a Gmail App Password

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification (enable it if it isn't already)
3. Security → App passwords → Create one for "WH Watcher"
4. Copy the generated 16-character code

## How to get a Discord Webhook

Discord channel → Edit Channel → Integrations → Webhooks → New Webhook → Copy URL

## Check intervals (default)

| Type               | Interval | Notes                              |
| ------------------ | -------- | ----------------------------------- |
| Watched books      | 2 min    | Configurable in the app (Config)    |
| Pre-orders         | 10 min   | GW releases them on Friday mornings |

## Useful commands

```bash
docker compose up -d          # Start
docker compose down           # Stop
docker compose logs -f        # View logs
docker compose up -d --build  # Rebuild after changes

# Test notifications (or use the button in the app)
curl -X POST http://localhost:8080/test-notify

# Check status
curl http://localhost:8080/health
```

## On Unraid (single container via UI)

- **Repository:** leave empty (uses local build) or build the image beforehand with `docker build`
- **Name:** `wh-tracker`
- **Port:** `8080:8080`
- **Path 1:** Host `/mnt/user/appdata/wh-tracker/data` → Container `/app/data`
- **Path 2:** Host `/mnt/user/appdata/wh-tracker/config.json` → Container `/app/config.json`

Copy the files to `/mnt/user/appdata/wh-tracker/` via SSH or File Manager,
run `docker build -t wh-tracker ./watcher`, and use the `wh-tracker` image.

