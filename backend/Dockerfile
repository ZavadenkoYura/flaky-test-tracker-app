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

# Data lives in a separate PostgreSQL instance — set DB_HOST/DB_PORT/DB_NAME/
# DB_USER/DB_PASSWORD at deploy time to point at it (see src/config.ts).
EXPOSE 3000
CMD ["node", "dist/src/server.js"]
