FROM node:20-slim

# Instala o curl para o envio de e-mails via SMTP
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copia APENAS o package.json (Ignoramos de propósito o package-lock.json que possa estar corrompido)
COPY package.json ./

# 2. Configura o npm para ignorar auditorias pesadas que travam o GitHub Actions e instala do zero
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm install --omit=dev --no-audit --no-fund --loglevel=verbose

# 3. Copia o código do backend e do frontend para os locais certos
COPY watcher/server.js .
COPY watcher/index.html .

# Cria a pasta para salvar os teus dados sem os perder
RUN mkdir -p /app/data

# Porta onde o teu script (server.js) está a escutar
EXPOSE 3000

CMD ["node", "server.js"]
