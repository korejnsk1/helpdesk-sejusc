FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# --host expõe o servidor na interface 0.0.0.0 (acessível na rede)
CMD ["npm", "run", "dev", "--", "--host"]
