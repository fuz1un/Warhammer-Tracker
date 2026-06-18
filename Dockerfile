FROM node:20-slim

# Instala o curl para o envio de e-mails via SMTP
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. CORREÇÃO DE CASE-SENSITIVITY: Aceita tanto package.json como package.JSON
COPY package.[jJ][sS][oO][nN] ./

# 2. Instala as dependências de forma limpa e isolada
RUN npm install --omit=dev --no-audit --no-fund

# 3. Copia o código do backend e do frontend a partir da subpasta watcher/
COPY watcher/server.js .
COPY watcher/index.html .

# Cria a pasta para persistência de dados
RUN mkdir -p /app/data

# Porta onde o teu script (server.js) está a escutar
EXPOSE 3000

CMD ["node", "server.js"]
