# ⚙ WH40K — Imperial Library

Black Library book availability tracker with email and Discord stock alerts. **A single container** serves both the frontend and the backend.

## Structure

```
wh-tracker/
├── docker-compose.yml
└── watcher/
    ├── Dockerfile
    ├── server.js          ← Node.js server (frontend + proxy + watcher)
    ├── index.html         ← web app
    └── config.example.json
```

## Quick setup

1. Copy the config file:

```
cp watcher/config.example.json watcher/config.json
```

2. Edit `watcher/config.json`:

```
{
  "emailEnabled": true,
  "emailUser":    "your@gmail.com",
  "emailPass":    "xxxx xxxx xxxx xxxx",
  "emailTo":      "your@gmail.com",
  "discordEnabled": true,
  "discordWebhook": "https://discord.com/api/webhooks/..."
}
```

3. Start it:

```
docker compose up -d
```

4. Open **<http://localhost:8080>**.**

## How to get a Gmail App Password

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification (enable it if it isn't already)
3. Security → App passwords → Create one for "WH Watcher"
4. Copy the generated 16-character code

## How to get a Discord Webhook

Discord channel → Edit Channel → Integrations → Webhooks → New Webhook → Copy URL

## Check intervals (default)

| Type              | Interval | Notes                              |
| ----------------- | -------- | ----------------------------------- |
| Watched books      | 2 min    | Configurable in the app (Config)    |
| Pre-orders          | 10 min   | GW releases them on Friday mornings |

## Useful commands

```
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
