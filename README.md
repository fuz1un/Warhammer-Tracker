# ⚙ WH40K — Biblioteca Imperial

Rastreador de livros Black Library com alertas de stock por email e Discord.

## Estrutura

```
wh-tracker/
├── docker-compose.yml
├── watcher/
│   ├── Dockerfile
│   ├── server.js          ← proxy + watcher (porta 3001)
│   └── config.example.json
└── frontend/
    ├── Dockerfile
    └── index.html         ← app web (porta 8080)
```

## Configuração rápida

1. Copia o ficheiro de config:
   ```bash
   cp watcher/config.example.json watcher/config.json
   ```

2. Edita `watcher/config.json` com os teus dados:
   ```json
   {
     "emailEnabled": true,
     "emailUser": "o-teu@gmail.com",
     "emailPass": "xxxx xxxx xxxx xxxx",
     "emailTo":   "o-teu@gmail.com",
     "discordEnabled": true,
     "discordWebhook": "https://discord.com/api/webhooks/..."
   }
   ```

3. Inicia:
   ```bash
   docker compose up -d
   ```

4. Abre **http://localhost:8080** (ou http://IP-UNRAID:8080)

## Como obter a App Password do Gmail

1. Vai a [myaccount.google.com](https://myaccount.google.com)
2. Segurança → Verificação em dois passos (ativa se não estiver)
3. Segurança → Palavras-passe de aplicações
4. Cria uma para "WH Watcher" e copia os 16 caracteres

## Como obter o Webhook do Discord

1. Abre o servidor Discord
2. Clica no canal onde queres as notificações → Editar canal
3. Integrações → Webhooks → Novo Webhook
4. Copia o URL

## Intervalos de verificação

| O que verifica       | Padrão | Recomendado            |
|----------------------|--------|------------------------|
| Livros vigiados      | 2 min  | 1-5 min                |
| Pré-encomendas       | 10 min | 10 min (sextas: 5 min) |
| Todos os livros      | 30 min | 30 min                 |

A GW lança novidades às **sextas-feiras de manhã** (hora UK).

## Comandos úteis

```bash
# Iniciar
docker compose up -d

# Ver logs em tempo real
docker compose logs -f watcher

# Parar
docker compose down

# Rebuild após alterações
docker compose up -d --build

# Testar notificações (também disponível na UI em Config → Testar)
curl -X POST http://localhost:3001/test-notify

# Ver estado do servidor
curl http://localhost:3001/health
```

## No Unraid

**Opção A — Docker Compose (Unraid 7+):**
- Settings → Docker → Compose → Add Stack
- Cola o conteúdo do `docker-compose.yml`
- Certifica-te que os ficheiros estão em `/mnt/user/appdata/wh-tracker/`

**Opção B — Dois containers via UI:**
- Cria `wh-watcher`: imagem `node:20-alpine`, porta `3001:3001`,
  volume `/mnt/user/appdata/wh-tracker/watcher:/app`
- Cria `wh-frontend`: imagem `nginx:alpine`, porta `8080:80`,
  volume `/mnt/user/appdata/wh-tracker/frontend:/usr/share/nginx/html`

Com **Tailscale** no Unraid, acedes à app de qualquer lado em
`http://100.78.220.87:8080`
