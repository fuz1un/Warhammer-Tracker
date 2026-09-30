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
- [x] Coleção, wishlist e histórico pessoal
- [x] Fluxo de reportar livro em falta ou corrigir metadata
- [x] Hardening de configuração e CORS para uso local/seguro
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
- mostrar novidades assinaladas pela loja
- mostrar livros vigiados
- filtros por idioma, formato, estado e pesquisa
- detalhes, séries, autores e biblioteca pessoal

## Proveniência e limites dos dados

A app consulta o índice Algolia público da loja Black Library através do backend. A origem atual fornece título, preço, disponibilidade, pré-encomenda, autor, série, formato, género, descrição, imagem, slug e o indicador de novidade `isNewRelease`.

O campo `series` reproduz a categoria do catálogo da loja; pode ser amplo (por exemplo, “Warhammer 40,000”) e não representa necessariamente uma série narrativa ou uma ordem de leitura. A fonte atual não fornece datas de publicação, ISBN, ratings, metadados de audiobook, facções ou ordens de leitura editoriais. Por isso, “Novidades” usa o indicador da loja, não uma cronologia completa.

O Grimdark Archive declara combinar dados da Hardcover com enriquecimento de Wikipedia, Google Books e Track of Words, além de ratings agregados e capas de várias origens. A nossa app não importa dados desse site nem reproduz ratings, sinopses ou ordens editoriais de terceiros.

Uma verificação pontual de três títulos encontrou `Horus Rising` na Open Library, mas como uma obra com 24 ISBNs/edições; `Blackheart: Claws of the Maelstrom` e `Master of Rites` não foram encontrados. A Open Library diz que a API não se destina a servir de backend de catálogo e recomenda tráfego baixo e identificado. A Google Books API exige uma chave para dados públicos; uma chamada de teste sem chave foi limitada por quota (`429`). Não ativamos nenhuma destas integrações automáticas. A API GraphQL da Hardcover também exige token; Track of Words é tratado como fonte editorial para consulta e links, não como API de catálogo.

Os estados Possuído, Lido, Wishlist e reports ficam no `localStorage` deste browser. A watchlist também é sincronizada com o estado local do servidor. Não existe sincronização na cloud nem analytics.

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
- [x] Mostrar meses / grupos por data de lançamento
- [ ] Adicionar paginação ou carregamento incremental

### Fase 3 — Detalhes do livro
- [x] Criar painel modal/side panel para cada livro
- [x] Mostrar resumo, autor, série, formato, data de lançamento
- [x] Mostrar relação com autores e séries
- [ ] Mostrar histórico de disponibilidade do livro

### Fase 4 — Séries e leitura
- [x] Agrupar por `series`
- [x] Página por série
- [x] Página por autor
- [x] Ordenação por leitura / cronologia

### Fase 5 — Coleção e wishlist
- [x] Listas pessoais: owned / read / wishlist
- [x] Persistência em ficheiro de estado local
- [x] Marcação rápida por interface
- [x] Vista “Minha biblioteca” com contador e filtro de estados pessoais

### Fase 6 — Qualidade e segurança
- [x] Revisão de inputs e validação do payload de API
- [x] Melhor tratamento de erros e fallbacks
- [x] Proteção adicional para acesso futuro global
- [x] Limitar exposição de dados sensíveis em logs e respostas
- [x] Revisão de CORS e headers HTTP em cenário global
- [x] Configuração segura por ambiente/local e ignorar ficheiros sensíveis no Git
- [x] Fluxo local de reportar livros com metadata em falta ou incorreta

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
- Usar allowlist de origens e headers de segurança básicos para qualquer futuro uso público

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

