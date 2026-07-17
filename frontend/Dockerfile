# --- build: compile the Vite/React app to static assets ---
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Baked in at build time — the API's origin, set per-environment.
ARG SERVICE_API_BASE_URL=http://localhost:3000/api/v1
ENV SERVICE_API_BASE_URL=$SERVICE_API_BASE_URL
RUN npm run build

# --- runtime: serve the static build with nginx ---
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
