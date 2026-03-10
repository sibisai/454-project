# Dockerfile — Frontend React application
#
# Multi-stage build:
#   Stage 1: Node 20 alpine — install dependencies and build React app
#   Stage 2: Nginx alpine — serve the static build output

FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf 2>/dev/null || true

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
