# Build from the repo root: docker build -f frontend/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY frontend/package.json frontend/
RUN npm ci --workspace=frontend --include-workspace-root

COPY frontend frontend
RUN npm run build --workspace=frontend

FROM nginx:alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
