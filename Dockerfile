# Usa uma imagem leve do Node 20
FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia todo o código
COPY . .

# Variáveis de ambiente necessárias no build do Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Faz o build
RUN npm run build

# Instala servidor estático
RUN npm install -g serve

# Expõe a porta e roda
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
