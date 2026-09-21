# TRUNK — Tool Routing & Unified Navigation Kit

TRUNK is a reusable central launcher for operational and maintenance web applications. It gives workstation users a compact, deterministic catalog, fast search, favorites, recent history, and sanitized service health without replacing the authorization controls of downstream applications. Each deployment supplies its own site identity, application registry, hostnames, and authentication configuration.

## Features

- Stable application catalog with explicit category and application order
- Coarse guest/authenticated discoverability (downstream apps retain authorization)
- Microsoft Entra ID authorization-code flow with state, nonce, PKCE, tenant checks, and server sessions
- Server-side search data plus in-page filtering and a keyboard-navigable Ctrl/Cmd+K palette
- Ordered favorites, recent application history, appearance, launch, and density preferences
- SQLite persistence for authenticated users; localStorage for guests
- Cached, server-side HTTP health probes with sanitized browser output
- Responsive workstation-first interface and accessible keyboard/focus behavior

## Architecture

```text
Browser
   │
   ▼
Caddy :80/:443
   │
   ▼
TRUNK / SvelteKit :3000
   │
   ├── YAML Application Registry
   ├── SQLite (WAL)
   ├── Microsoft Entra ID
   └── Health Monitor
            │
            ▼
       Downstream Apps
```

TRUNK controls discoverability only. Seeing an application card does not grant access; every downstream application owns and enforces its own Entra authorization. TRUNK never forwards its tokens, cookies, or identity to downstream applications.

## Technology

SvelteKit, Svelte 5, strict TypeScript, Vite, `@sveltejs/adapter-node`, Yarn 4, Node 24 LTS, Node's built-in SQLite API, Microsoft MSAL Node, Docker Compose, and Caddy.

## Development

Node 24+ and Corepack are required. All project package operations use Yarn.

```bash
corepack enable
yarn install --immutable
cp .env.example .env
yarn dev
yarn check
yarn lint
yarn test
yarn build
```

`AUTH_MODE=mock`, `NODE_ENV=development`, and `ENABLE_DEMO_APPS=true` provide a clearly marked local experience. Mock authentication is rejected when `NODE_ENV=production`.

Run browser tests after installing Chromium once:

```bash
yarn playwright install chromium
yarn test:e2e
```

## Production

Create `/opt/trunk/.env` from `.env.example`, use `AUTH_MODE=entra`, replace all placeholder values, disable demo applications, and configure the approved hostname and certificate policy. Then:

```bash
cd /opt/trunk
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

On a network that requires a private package-registry or TLS-inspection CA, set `CORPORATE_CA_CERT_PATH` and build with the optional override:

```bash
docker compose -f compose.yml -f compose.corporate-ca.yml.example build
docker compose up -d
```

Only Caddy publishes host ports 80/443. The `trunk` service is available only as `trunk:3000` on the Compose bridge. Both services use `restart: unless-stopped`; the application is non-root, read-only except for `/app/data`, drops all capabilities, and has no Docker socket.

## Configuration

| Variable                          | Purpose                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `NODE_ENV`                        | `development`, `test`, or `production`                                                |
| `TRUNK_SITE_NAME`                 | Site, department, or team label displayed beside TRUNK                                |
| `TRUNK_SITE_DESCRIPTION`          | Short deployment description used on Home and in page metadata                        |
| `ORIGIN`                          | Externally visible origin used by SvelteKit, such as `https://trunk.example.internal` |
| `HOST`, `PORT`                    | Node bind address and internal port; production uses `0.0.0.0:3000`                   |
| `AUTH_MODE`                       | `mock` for development only or `entra` for production                                 |
| `ENTRA_TENANT_ID`                 | Intended organization tenant UUID                                                     |
| `ENTRA_CLIENT_ID`                 | TRUNK app registration (client) UUID                                                  |
| `ENTRA_CLIENT_SECRET`             | Confidential-client credential, server-side only                                      |
| `ENTRA_REDIRECT_URI`              | Exact callback: `https://<approved-host>/auth/callback`                               |
| `ENTRA_POST_LOGOUT_REDIRECT_URI`  | Registered post-logout return: `https://<approved-host>/`                             |
| `SESSION_SECRET`                  | At least 32 random characters; do not commit                                          |
| `SESSION_TTL_SECONDS`             | Server session lifetime (default 28800)                                               |
| `DATABASE_PATH`                   | SQLite path; Compose uses `/app/data/trunk.db`                                        |
| `APPLICATION_REGISTRY_PATH`       | YAML registry path                                                                    |
| `ENABLE_DEMO_APPS`                | Explicitly load demo/nonlaunchable records; false in production                       |
| `HEALTH_DEFAULT_INTERVAL_SECONDS` | Default HTTP probe cadence                                                            |
| `HEALTH_TIMEOUT_MS`               | Probe timeout                                                                         |
| `TRUNK_HOSTNAME`                  | Caddy site address (`:80` only for initial local HTTP)                                |
| `CORPORATE_CA_CERT_PATH`          | Host path to the corporate CA supplied as a Docker build secret                       |

Startup validation rejects incomplete Entra configuration and production mock mode. Secrets never enter client bundles or tracked files.

### Branding and deployment customization

TRUNK is the product identity. `TRUNK_SITE_NAME` and `TRUNK_SITE_DESCRIPTION` customize each deployment at runtime without rebuilding the application. The site name appears in the sidebar, browser title, Home heading, and catalog copy. Application names, categories, descriptions, icons, ordering, URLs, tags, visibility, and health probes are entirely controlled by `config/applications.yaml`.

The checked-in registry contains explicit, nonlaunchable industrial demo records. Replace it with the deployment's own registry and set `ENABLE_DEMO_APPS=false` for production. Keep secrets and environment-specific private health endpoints out of public Git history.

## Application registry

Edit `config/applications.yaml`. IDs must be unique lowercase slugs. Both categories and applications carry explicit ordering; never repurpose order as a popularity score.

```yaml
categories:
  - { name: Furnace, order: 400 }
applications:
  - id: roll-monitor
    display:
      name: Roll Monitor
      description: Tunnel furnace roll monitoring and diagnostics
      category: Furnace
      icon: monitor
      order: 100
      new: false
    route:
      url: https://approved-host.internal
    access:
      visibility: authenticated # or guest
    search:
      tags: [rolls, encoder, furnace]
    health:
      type: http
      url: http://private-upstream:8080/health
      intervalSeconds: 30
      expectedStatus: 200
    demo: false
```

Health URLs remain server-side. `/api/applications` only returns public card fields and filters authenticated entries from guests.

## Health monitoring

`health.type` may be `none` or `http`. HTTP probes run inside TRUNK, use a timeout, cache in memory, and map results to online/degraded/offline/unknown. Failures cannot crash the process, and normal users see neither URLs nor raw errors. TRUNK liveness is unauthenticated at `/healthz` and reveals only service/status.

## Authentication

TRUNK uses a tenant-specific confidential web application through MSAL Node. `/auth/login` starts authorization code + PKCE; `/auth/callback` validates state, nonce, and tenant before creating the server-side identity. The stable persistence key is tenant ID plus Entra object ID, never name or email. Cookies are HttpOnly, SameSite=Lax, and Secure in production. Mutating requests require the per-session CSRF token.

Register these web redirect locations once the permanent hostname is approved:

- Sign-in: `https://<approved-host>/auth/callback`
- Post logout: `https://<approved-host>/`

No delegated API permission beyond standard OIDC identity scopes is required for this implementation.

## Database and backup

SQLite is stored at `/opt/trunk/data/trunk.db` through the `/app/data` bind mount. WAL and a busy timeout are enabled. Schema migration 1 is applied idempotently at startup and recorded in `migrations`.

Back up the database consistently (include `trunk.db`, `trunk.db-wal`, and `trunk.db-shm` while live, or stop TRUNK for a simple file copy), `config/applications.yaml`, and the untracked `.env` through the organization's approved secret/configuration backup system. Source is recoverable from GitHub after repository registration.

## Updating

```bash
cd /opt/trunk
git pull --ff-only
docker compose build
docker compose up -d
docker compose ps
```

## Troubleshooting

```bash
docker compose ps
docker compose logs -f
docker compose logs trunk
docker compose logs caddy
curl -fsS http://127.0.0.1/healthz
```

If startup fails, inspect the first TRUNK log entry for an actionable configuration or registry validation error. If package downloads fail behind TLS inspection, provide the corporate CA at `CORPORATE_CA_CERT_PATH`; never put registry credentials in tracked files.
