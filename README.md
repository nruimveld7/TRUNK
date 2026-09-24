# TRUNK — Tool Routing & Unified Navigation Kit

TRUNK is a reusable central launcher for operational and maintenance web applications. It gives workstation users a compact, deterministic catalog, fast search, favorites, recent history, and sanitized service health without replacing the authorization controls of downstream applications. Each deployment supplies its own site identity, application registry, hostnames, and authentication configuration.

## Features

- Stable application catalog with explicit category and application order
- Coarse guest/authenticated discoverability (downstream apps retain authorization)
- Microsoft Entra ID authorization-code flow with state, nonce, PKCE, tenant checks, and server sessions
- Frontend administration for site identity, application catalog, and the Maintainer OID list
- Microsoft Graph directory search and optional SMTP relay notifications for access changes
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
   ├── YAML Registry + SQLite Overrides
   ├── Microsoft Entra ID + Graph
   ├── Corporate SMTP Relay (optional)
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
./scripts/StartProd.sh
```

The production scripts follow the established ELM operational pattern without a separate development stack:

```bash
./scripts/StartProd.sh  # validate, build, start/recreate, wait for health, show status
./scripts/Status.sh     # show production container status
./scripts/ProdLogs.sh   # follow the last 200 production log lines
./scripts/StopProd.sh   # stop containers while preserving data and Caddy volumes
```

`StartProd.sh` uses `.env` by default. Set `TRUNK_ENV_FILE=/path/to/file` to use a different environment file. It runs the containers as the invoking account's UID/GID so the SQLite bind mount and read-only certificate files remain accessible. Running it again after changing `.env`, certificates, or source safely rebuilds and recreates the stack.

### Initial production integration checklist

1. Choose the permanent HTTPS URL and create its DNS record pointing to the TRUNK VM.
2. Decide whether Caddy can obtain a publicly trusted certificate or must use the organization's internal PKI. Do not start production until the hostname and certificate policy are known.
3. Create a tenant-specific Microsoft Entra web app registration for TRUNK.
4. Add these Web redirect URIs, using the exact permanent origin:
   - `https://<trunk-host>/auth/callback`
   - `https://<trunk-host>/`
5. Add Microsoft Graph delegated permission `User.ReadBasic.All` and grant tenant consent if required by policy. TRUNK also requests the standard `openid`, `profile`, `email`, and `offline_access` scopes.
6. Create or select the client certificate. Upload only its public certificate to the Entra app registration. Place the private key at `certs/entra-client.key` and the public certificate at `certs/entra-client.crt`; never commit either file.
7. Copy `.env.example` to the untracked `.env` file and set:
   - `ORIGIN`, `TRUNK_HOSTNAME`, and both Entra redirect values to the permanent HTTPS URL.
   - `AUTH_MODE=entra`, the tenant ID, client ID, and certificate paths.
   - A new 32+ character `SESSION_SECRET`.
   - At least one trusted Entra OID in `BOOTSTRAP_MAINTAINER_OIDS`.
   - `ENABLE_DEMO_APPS=false` for production.
   - The SMTP relay host and sender address if access notifications are wanted.
8. Ensure inbound TCP 80/443 and any required outbound Entra, Graph, SMTP-relay, DNS, and certificate-authority traffic are allowed.
9. Run `./scripts/StartProd.sh`, browse to the permanent URL, sign in as the bootstrap Maintainer, and confirm that `/admin` is available.

On a network that requires a private package-registry or TLS-inspection CA, set `CORPORATE_CA_CERT_PATH` and build with the optional override:

```bash
./scripts/StartProd.sh
```

Only Caddy publishes host ports 80/443. The `trunk` service is available only as `trunk:3000` on the Compose bridge. Both services use `restart: unless-stopped`; the application is non-root, read-only except for `/app/data`, drops all capabilities, and has no Docker socket.

## Configuration

| Variable                             | Purpose                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `NODE_ENV`                           | `development`, `test`, or `production`                                                |
| `TRUNK_SITE_NAME`                    | Site, department, or team label displayed beside TRUNK                                |
| `TRUNK_SITE_DESCRIPTION`             | Short deployment description used on Home and in page metadata                        |
| `TRUNK_ACCENT_COLOR`                 | Initial six-digit hex accent color; maintainers can override it in the UI             |
| `ORIGIN`                             | Externally visible origin used by SvelteKit, such as `https://trunk.example.internal` |
| `HOST`, `PORT`                       | Node bind address and internal port; production uses `0.0.0.0:3000`                   |
| `AUTH_MODE`                          | `mock` for development only or `entra` for production                                 |
| `ENTRA_TENANT_ID`                    | Intended organization tenant UUID                                                     |
| `ENTRA_CLIENT_ID`                    | TRUNK app registration (client) UUID                                                  |
| `ENTRA_CLIENT_SECRET`                | Optional confidential-client secret, server-side only                                 |
| `ENTRA_CLIENT_CERT_PRIVATE_KEY_PATH` | Preferred client certificate private-key path                                         |
| `ENTRA_CLIENT_CERT_PUBLIC_CERT_PATH` | Preferred client certificate public-cert path                                         |
| `ENTRA_REDIRECT_URI`                 | Exact callback: `https://<approved-host>/auth/callback`                               |
| `ENTRA_POST_LOGOUT_REDIRECT_URI`     | Registered post-logout return: `https://<approved-host>/`                             |
| `SESSION_SECRET`                     | At least 32 random characters; do not commit                                          |
| `SESSION_TTL_SECONDS`                | Server session lifetime (default 28800)                                               |
| `BOOTSTRAP_MAINTAINER_OIDS`          | Comma/space-separated Entra object IDs that always receive Maintainer access          |
| `SMTP_RELAY_HOST`                    | Optional unauthenticated corporate SMTP relay host; port 25                           |
| `SMTP_MAIL_FROM`                     | Sender address for access-change notifications                                        |
| `EMAIL_RECIPIENT_OVERRIDE`           | Optional nonproduction recipient override                                             |
| `DATABASE_PATH`                      | SQLite path; Compose uses `/app/data/trunk.db`                                        |
| `APPLICATION_REGISTRY_PATH`          | YAML registry path                                                                    |
| `ENABLE_DEMO_APPS`                   | Explicitly load demo/nonlaunchable records; false in production                       |
| `HEALTH_DEFAULT_INTERVAL_SECONDS`    | Default HTTP probe cadence                                                            |
| `HEALTH_TIMEOUT_MS`                  | Probe timeout                                                                         |
| `TRUNK_HOSTNAME`                     | Caddy site address (`:80` only for initial local HTTP)                                |
| `CORPORATE_CA_CERT_PATH`             | Host path to the corporate CA supplied as a Docker build secret                       |

Startup validation rejects incomplete Entra configuration and production mock mode. Secrets never enter client bundles or tracked files.

### Branding and deployment customization

TRUNK is the product identity. `TRUNK_SITE_NAME`, `TRUNK_SITE_DESCRIPTION`, and `TRUNK_ACCENT_COLOR` provide deployment defaults without rebuilding. A Maintainer can change the same site identity values and manage application names, categories, descriptions, icons, ordering, URLs, tags, visibility, and health probes at `/admin`. UI changes are stored as SQLite overrides; the checked-in YAML remains the portable seed catalog.

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

## Authentication and access levels

TRUNK uses a tenant-specific confidential web application through MSAL Node. `/auth/login` starts authorization code + PKCE; `/auth/callback` validates state, nonce, and tenant before creating the server-side identity. The stable persistence key is tenant ID plus Entra object ID, never name or email. Cookies are HttpOnly, SameSite=Lax, and Secure in production. Mutating requests require the per-session CSRF token.

Use a certificate credential in production by placing `entra-client.key` and `entra-client.crt` in the untracked `certs/` directory and configuring their `/app/certs/...` paths. A client secret remains supported as a fallback. The private key is mounted read-only and must never be committed.

TRUNK derives access without maintaining a separate user directory: an unauthenticated session is a `Guest`, every authenticated Entra identity is a `User`, and an authenticated identity whose OID is in the Maintainer list is a `Maintainer`. Only Maintainer OIDs and common display names are stored; regular users are never provisioned into an access table.

Set `BOOTSTRAP_MAINTAINER_OIDS` to at least one trusted Entra object ID before first sign-in. Maintainers can then search the tenant directory and add more Maintainer OIDs from `/admin`. The Graph search uses the signed-in Maintainer's delegated token and requests `User.ReadBasic.All`; grant tenant consent if organizational policy requires it. These access levels apply only to TRUNK, not to downstream applications.

Register these web redirect locations once the permanent hostname is approved:

- Sign-in: `https://<approved-host>/auth/callback`
- Post logout: `https://<approved-host>/`

Requested delegated scopes are `openid`, `profile`, `email`, `offline_access`, and `User.ReadBasic.All`.

## Database and backup

SQLite is stored at `/opt/trunk/data/trunk.db` through the `/app/data` bind mount. WAL and a busy timeout are enabled. Idempotent schema migrations are recorded in `migrations`; current data includes sessions, preferences, launch history, the Maintainer OID/name list, application overrides, and site settings. Protect the data directory as credential-bearing application state because active Entra access tokens are held in server sessions for directory search.

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
