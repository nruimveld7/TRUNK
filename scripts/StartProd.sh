#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${TRUNK_ENV_FILE:-$ROOT_DIR/.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing production environment file: $ENV_FILE" >&2
  echo "Create it from .env.example and replace every deployment-specific value." >&2
  exit 1
fi

read_env_value() {
  local file_path="$1"
  local key="$2"
  local line
  line="$(awk -v k="$key" '$0 ~ ("^" k "=") { print; exit }' "$file_path")"
  if [[ -z "$line" ]]; then
    return 1
  fi
  local value="${line#*=}"
  value="${value%$'\r'}"
  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi
  printf '%s' "$value"
}

require_env_value() {
  local key="$1"
  local value
  value="$(read_env_value "$ENV_FILE" "$key" || true)"
  if [[ -z "$value" ]]; then
    echo "$key must be set in $ENV_FILE" >&2
    exit 1
  fi
  printf '%s' "$value"
}

ORIGIN_VALUE="$(read_env_value "$ENV_FILE" ORIGIN || true)"
AUTH_MODE_VALUE="$(read_env_value "$ENV_FILE" AUTH_MODE || true)"
BOOTSTRAP_VALUE="$(read_env_value "$ENV_FILE" BOOTSTRAP_MAINTAINER_OIDS || true)"
if [[ "$ORIGIN_VALUE" != https://* ]]; then
  echo "ORIGIN must be set to TRUNK's externally visible HTTPS URL in $ENV_FILE" >&2
  exit 1
fi
if [[ "$AUTH_MODE_VALUE" != "entra" ]]; then
  echo "AUTH_MODE must be set to entra for production." >&2
  exit 1
fi
require_env_value ENTRA_TENANT_ID >/dev/null
require_env_value ENTRA_CLIENT_ID >/dev/null
require_env_value ENTRA_REDIRECT_URI >/dev/null
require_env_value ENTRA_POST_LOGOUT_REDIRECT_URI >/dev/null
require_env_value TRUNK_HOSTNAME >/dev/null
EXPECTED_REDIRECT="${ORIGIN_VALUE%/}/auth/callback"
EXPECTED_LOGOUT_REDIRECT="${ORIGIN_VALUE%/}/"
if [[ "$(read_env_value "$ENV_FILE" ENTRA_REDIRECT_URI)" != "$EXPECTED_REDIRECT" ]]; then
  echo "ENTRA_REDIRECT_URI must equal $EXPECTED_REDIRECT" >&2
  exit 1
fi
if [[ "$(read_env_value "$ENV_FILE" ENTRA_POST_LOGOUT_REDIRECT_URI)" != "$EXPECTED_LOGOUT_REDIRECT" ]]; then
  echo "ENTRA_POST_LOGOUT_REDIRECT_URI must equal $EXPECTED_LOGOUT_REDIRECT" >&2
  exit 1
fi
if [[ -z "$BOOTSTRAP_VALUE" ]]; then
  echo "BOOTSTRAP_MAINTAINER_OIDS must contain at least one trusted Entra user OID." >&2
  exit 1
fi

SESSION_SECRET_VALUE="$(require_env_value SESSION_SECRET)"
if [[ "$SESSION_SECRET_VALUE" == "replace-with-at-least-32-random-characters" || ${#SESSION_SECRET_VALUE} -lt 32 ]]; then
  echo "Replace the example SESSION_SECRET with at least 32 random characters." >&2
  exit 1
fi

CLIENT_SECRET_VALUE="$(read_env_value "$ENV_FILE" ENTRA_CLIENT_SECRET || true)"
PRIVATE_KEY_PATH="$(read_env_value "$ENV_FILE" ENTRA_CLIENT_CERT_PRIVATE_KEY_PATH || true)"
PUBLIC_CERT_PATH="$(read_env_value "$ENV_FILE" ENTRA_CLIENT_CERT_PUBLIC_CERT_PATH || true)"
if [[ -z "$CLIENT_SECRET_VALUE" ]]; then
  if [[ "$PRIVATE_KEY_PATH" != /app/certs/* || "$PUBLIC_CERT_PATH" != /app/certs/* ]]; then
    echo "Certificate credential paths must be under /app/certs when no client secret is set." >&2
    exit 1
  fi
  HOST_PRIVATE_KEY="$ROOT_DIR/certs/${PRIVATE_KEY_PATH#/app/certs/}"
  HOST_PUBLIC_CERT="$ROOT_DIR/certs/${PUBLIC_CERT_PATH#/app/certs/}"
  if [[ ! -r "$HOST_PRIVATE_KEY" || ! -r "$HOST_PUBLIC_CERT" ]]; then
    echo "The configured Entra certificate/key files are missing or unreadable in $ROOT_DIR/certs." >&2
    exit 1
  fi
fi

mkdir -p "$ROOT_DIR/data" "$ROOT_DIR/certs"
export TRUNK_UID="$(id -u)"
export TRUNK_GID="$(id -g)"

COMPOSE_ARGS=(--env-file "$ENV_FILE" -p trunk-prod -f compose.yml)
CORPORATE_CA_PATH="$(read_env_value "$ENV_FILE" CORPORATE_CA_CERT_PATH || true)"
if [[ -n "$CORPORATE_CA_PATH" && -f "$CORPORATE_CA_PATH" ]]; then
  COMPOSE_ARGS+=(-f compose.corporate-ca.yml.example)
fi

docker compose "${COMPOSE_ARGS[@]}" config --quiet
docker compose "${COMPOSE_ARGS[@]}" up -d --build --remove-orphans --wait --wait-timeout 180
docker compose "${COMPOSE_ARGS[@]}" ps

echo
echo "TRUNK is running at $ORIGIN_VALUE"
