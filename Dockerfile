# ============================================
# Etapa 1: build do bundle Vite
# ============================================
FROM node:20 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Variáveis públicas incorporadas ao bundle durante o build.
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_API_TARGET

ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_API_TARGET=${VITE_API_TARGET}

# Interrompe o build se o Portainer/Compose não repassar as variáveis.
RUN if [ -z "${VITE_GOOGLE_CLIENT_ID}" ]; then \
      echo "ERRO: VITE_GOOGLE_CLIENT_ID não informado no build"; \
      exit 1; \
    fi && \
    if [ -z "${VITE_API_TARGET}" ]; then \
      echo "ERRO: VITE_API_TARGET não informado no build"; \
      exit 1; \
    fi

RUN npm run build

# ============================================
# Etapa 2: servidor Nginx
# ============================================
FROM nginx:alpine

RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/ /usr/share/nginx/html/

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
