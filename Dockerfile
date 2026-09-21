# syntax=docker/dockerfile:1.7
FROM node:24.21-alpine AS base
RUN apk add --no-cache ca-certificates
WORKDIR /app
RUN corepack enable

FROM base AS dependencies
COPY package.json yarn.lock .yarnrc.yml ./
RUN --mount=type=secret,id=corporate_ca,required=false \
    if [ -f /run/secrets/corporate_ca ]; then \
      cp /run/secrets/corporate_ca /usr/local/share/ca-certificates/corporate.crt && \
      update-ca-certificates && \
      NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/corporate.crt yarn install --immutable; \
    else \
      yarn install --immutable; \
    fi

FROM dependencies AS builder
COPY . .
RUN yarn build

FROM dependencies AS production-dependencies
RUN yarn workspaces focus --production

FROM node:24.21-alpine AS runtime
RUN apk add --no-cache ca-certificates wget && addgroup -S trunk && adduser -S -G trunk -h /app trunk
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=production-dependencies --chown=trunk:trunk /app/node_modules ./node_modules
COPY --from=builder --chown=trunk:trunk /app/build ./build
COPY --from=builder --chown=trunk:trunk /app/package.json ./package.json
COPY --from=builder --chown=trunk:trunk /app/config ./config
RUN mkdir -p /app/data && chown trunk:trunk /app/data
USER trunk
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 CMD wget -q --spider http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "build"]
