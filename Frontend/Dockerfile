# The single public entry point: Caddy serves the built frontend and proxies /api to the Web API.
# Build context: Frontend/
FROM node:24-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2
COPY --from=build /src/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
