# Build from the repo root: docker build -f backend/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/package.json backend/
RUN npm ci --workspace=backend --include-workspace-root

COPY backend backend
RUN npm run build --workspace=backend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY backend/package.json backend/
RUN npm ci --omit=dev --workspace=backend --include-workspace-root

COPY --from=build /app/backend/dist backend/dist

EXPOSE 4000
USER node
CMD ["node", "backend/dist/server.js"]
