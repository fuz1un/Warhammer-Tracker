FROM node:20-alpine

# curl para envio de email via SMTP
RUN apk add --no-cache curl

WORKDIR /app

# 1. Copia os ficheiros de dependências primeiro
COPY package*.json ./

# 2. Instala as dependências necessárias (como o axios)
RUN npm install --omit=dev

# 3. Copia o código e o frontend
COPY server.js .
COPY index.html .

# Volume para persistir estado (watched list, last status)
RUN mkdir -p /app/data

# 4. Alinha a porta com o teu server.js (Porta 3000)
EXPOSE 3000

CMD ["node", "server.js"]
