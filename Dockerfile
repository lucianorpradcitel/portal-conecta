# ============================================
# Etapa 1: build do bundle Vite
# ============================================
FROM node:20 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# O client ID é público por design (não é o client secret) e precisa ser inlinado no bundle.
# Nenhuma credencial entra aqui: a autenticação é sempre pelo Google, no navegador.
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# ============================================
# Etapa 2: servindo com Nginx
# ============================================
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

# O Vite gera em dist/ (o projeto Angular gera em dist/monint/browser).
COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
