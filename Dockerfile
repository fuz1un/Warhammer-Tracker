FROM node:20-alpine

# Instala o curl para o envio de e-mails via SMTP
RUN apk add --no-cache curl

WORKDIR /app

# 1. Copia os ficheiros de dependências que estão na mesma pasta (raiz)
COPY package*.json ./

# 2. Instala as dependências de forma limpa e isolada
RUN npm install --omit=dev

# 3. Copia o código e o frontend a partir da subpasta watcher/
COPY watcher/server.js .
COPY watcher/index.html .

# Cria o volume para persistência de dados
RUN mkdir -p /app/data

# Alinha com a porta da tua aplicação (3000)
EXPOSE 3000

CMD ["node", "server.js"]