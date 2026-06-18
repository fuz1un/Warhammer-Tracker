FROM node:20-alpine

# curl para envio de email via SMTP
RUN apk add --no-cache curl

WORKDIR /app

# Código e frontend
COPY server.js .
COPY index.html .

# Volume para persistir estado (watched list, last status)
RUN mkdir -p /app/data

EXPOSE 8080
CMD ["node", "server.js"]
