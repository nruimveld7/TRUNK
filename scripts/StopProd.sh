#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${TRUNK_ENV_FILE:-$ROOT_DIR/.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing production environment file: $ENV_FILE" >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" -p trunk-prod -f compose.yml down --remove-orphans
echo "TRUNK stopped. SQLite data, certificates, and Caddy volumes were preserved."
