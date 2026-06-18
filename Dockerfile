FROM node:20-alpine

# Instala o curl para o envio de e-mails via SMTP
RUN apk add --no-cache curl

WORKDIR /app

# 1. CORREÇÃO: Como não tens o package.json, criamos um projeto Node mínimo na hora
RUN npm init -y

# 2. Instala diretamente o axios (necessário para o teu server.js) de forma limpa
RUN npm install axios --omit=dev

# 3. Copia o teu código de dentro da pasta watcher e o HTML para a raiz da app
COPY watcher/server.js .
COPY watcher/index.html .

# Cria a pasta para persistência de dados
RUN mkdir -p /app/data

# Porta onde o teu script (server.js) está a escutar
EXPOSE 3000

CMD ["node", "server.js"]
