# --- deps: install with dev deps so tsc is available for the build stage ---
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile TypeScript to dist/ ---
FROM deps AS build
COPY . .
RUN npm run build

# --- runtime: prod deps only + compiled output ---
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# The embedding model downloads on first request and is cached under this
# dir — mount a volume so it isn't re-downloaded on every container restart.
ENV MODEL_CACHE_DIR=/app/.cache
VOLUME ["/app/.cache"]

EXPOSE 4100
CMD ["node", "dist/src/server.js"]
