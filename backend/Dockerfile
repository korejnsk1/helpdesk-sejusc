FROM node:20-alpine

# Prisma schema engine precisa do OpenSSL no Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Instala dependências primeiro (cache de layer)
COPY package*.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Gera o Prisma client para a plataforma Linux
RUN npx prisma generate

EXPOSE 3333

# Na inicialização: gera client, aplica migrations e sobe o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
