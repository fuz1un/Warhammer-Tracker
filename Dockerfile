FROM node:20-slim

# Instala o curl (necessário para o teu envio de e-mails por SMTP)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copia os ficheiros de dependências da raiz do projeto
COPY package*.json ./

# 2. Instala as dependências de forma limpa e estável (Desativa os logs problemáticos do npm)
RUN npm install --omit=dev --max-logs=0

# 3. Copia o código do backend e do frontend para os locais esperados
COPY watcher/server.js .
COPY watcher/index.html .

# Cria a pasta de dados para persistência
RUN mkdir -p /app/data

# Alinha a porta exposta com a porta real da aplicação (3000)
EXPOSE 3000

CMD ["node", "server.js"]
