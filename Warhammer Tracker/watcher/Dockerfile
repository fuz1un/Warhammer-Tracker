FROM node:20-alpine

# curl para envio de email SMTP
RUN apk add --no-cache curl

WORKDIR /app
COPY server.js .

# data/ é montado como volume para persistir estado
RUN mkdir -p /app/data

EXPOSE 3001
CMD ["node", "server.js"]
