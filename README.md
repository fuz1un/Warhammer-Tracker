# ⚙ WH40K — Biblioteca Imperial

Rastreador de livros Black Library com alertas de stock por email e Discord.
**Um único container** serve o frontend e o backend.

## Estrutura

```
wh-tracker/
├── docker-compose.yml
└── watcher/
    ├── Dockerfile
    ├── server.js          ← servidor Node.js (frontend + proxy + watcher)
    ├── index.html         ← app web
    └── config.example.json
```

## Configuração rápida

1. Copia o ficheiro de config:
   ```bash
   cp watcher/config.example.json watcher/config.json
   ```

2. Edita `watcher/config.json`:
   ```json
   {
     "emailEnabled": true,
     "emailUser":    "o-teu@gmail.com",
     "emailPass":    "xxxx xxxx xxxx xxxx",
     "emailTo":      "o-teu@gmail.com",
     "discordEnabled": true,
     "discordWebhook": "https://discord.com/api/webhooks/..."
   }
   ```

3. Inicia:
   ```bash
   docker compose up -d
   ```

4. Abre **http://localhost:8080**
   No Unraid com Tailscale: **http://100.78.220.87:8080**

## Como obter a App Password do Gmail

1. Vai a [myaccount.google.com](https://myaccount.google.com)
2. Segurança → Verificação em dois passos (ativa se não estiver)
3. Segurança → Palavras-passe de aplicações → Cria para "WH Watcher"
4. Copia os 16 caracteres gerados

## Como obter o Webhook do Discord

Canal Discord → Editar canal → Integrações → Webhooks → Novo Webhook → Copiar URL

## Intervalos de verificação (padrão)

| Tipo                 | Intervalo | Notas                          |
|----------------------|-----------|--------------------------------|
| Livros vigiados      | 2 min     | Alterável na app (Config)      |
| Pré-encomendas       | 10 min    | A GW lança às sextas de manhã  |

## Comandos úteis

```bash
docker compose up -d          # Iniciar
docker compose down           # Parar
docker compose logs -f        # Ver logs
docker compose up -d --build  # Rebuild após alterações

# Testar notificações (ou usa o botão na app)
curl -X POST http://localhost:8080/test-notify

# Ver estado
curl http://localhost:8080/health
```

## No Unraid (container único via UI)

- **Repository:** deixa vazio (usa build local) ou cria a imagem antes com `docker build`
- **Name:** `wh-tracker`
- **Port:** `8080:8080`
- **Path 1:** Host `/mnt/user/appdata/wh-tracker/data` → Container `/app/data`
- **Path 2:** Host `/mnt/user/appdata/wh-tracker/config.json` → Container `/app/config.json`

Copia os ficheiros para `/mnt/user/appdata/wh-tracker/` via SSH ou File Manager,
faz `docker build -t wh-tracker ./watcher` e usa a imagem `wh-tracker`.
