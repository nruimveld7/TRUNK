#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${TRUNK_ENV_FILE:-$ROOT_DIR/.env}"

docker compose --env-file "$ENV_FILE" -p trunk-prod -f "$ROOT_DIR/compose.yml" logs -f --tail=200
