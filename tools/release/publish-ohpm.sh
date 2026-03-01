#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_ENV_FILE="${RELEASE_ENV_FILE:-$SCRIPT_DIR/.release.env}"
if [[ -f "$RELEASE_ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$RELEASE_ENV_FILE"
  set +a
fi

HAR_PATH="${HAR_PATH:-}"
DRY_RUN="false"
OHPM_RC_PATH="${OHPM_RC_PATH:-$HOME/.ohpm/.ohpmrc}"
PUBLISH_REGISTRY="${OHPM_REGISTRY:-}"
KEY_PATH="${OHPM_KEY_PATH:-}"
PUBLISH_ID="${OHPM_PUBLISH_ID:-}"

read_ohpmrc_value() {
  local key="$1"
  [[ -f "$OHPM_RC_PATH" ]] || return 0
  awk -F= -v key="$key" '
    $1 ~ "^[[:space:]]*" key "[[:space:]]*$" {
      v=$2
      sub(/^[[:space:]]+/, "", v)
      sub(/[[:space:]]+$/, "", v)
      gsub(/^"|"$/, "", v)
      print v
      exit
    }
  ' "$OHPM_RC_PATH"
}

usage() {
  cat <<'EOF'
Usage:
  publish-ohpm.sh --har <path-to-har> [--dry-run]

Recommended config:
  ~/.ohpm/.ohpmrc with publish_id/publish_registry/key_path

Optional project config file:
  tools/release/.release.env (or env RELEASE_ENV_FILE)
  Supported keys: HAR_PATH

Optional environment overrides:
  OHPM_PUBLISH_ID / OHPM_REGISTRY / OHPM_KEY_PATH
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --har)
      HAR_PATH="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

[[ -n "$HAR_PATH" ]] || { echo "Missing --har" >&2; usage; exit 1; }

if [[ -z "$PUBLISH_ID" ]]; then
  PUBLISH_ID="$(read_ohpmrc_value publish_id)"
fi
if [[ -z "$PUBLISH_REGISTRY" ]]; then
  PUBLISH_REGISTRY="$(read_ohpmrc_value publish_registry)"
fi
if [[ -z "$PUBLISH_REGISTRY" ]]; then
  PUBLISH_REGISTRY="$(read_ohpmrc_value registry)"
fi
if [[ -z "$KEY_PATH" ]]; then
  KEY_PATH="$(read_ohpmrc_value key_path)"
fi

command -v ohpm >/dev/null 2>&1 || { echo "ohpm not found in PATH" >&2; exit 1; }
[[ -f "$HAR_PATH" ]] || { echo "HAR file not found: $HAR_PATH" >&2; exit 1; }
[[ -n "$PUBLISH_ID" ]] || { echo "publish_id is empty (env or $OHPM_RC_PATH)" >&2; exit 1; }
[[ -n "$PUBLISH_REGISTRY" ]] || { echo "publish_registry/registry is empty (env or $OHPM_RC_PATH)" >&2; exit 1; }
[[ -n "$KEY_PATH" ]] || { echo "key_path is empty (env or $OHPM_RC_PATH)" >&2; exit 1; }
[[ -f "$KEY_PATH" ]] || { echo "Key file not found: $KEY_PATH" >&2; exit 1; }

CMD=(ohpm publish "$HAR_PATH")

echo "HAR: $HAR_PATH"
echo "Config: $OHPM_RC_PATH"
echo "Registry: $PUBLISH_REGISTRY"
echo "Publish ID: $PUBLISH_ID"
echo "Key path: $KEY_PATH"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "DRY RUN command:"
  printf '  %q' "${CMD[@]}"
  printf '\n'
  exit 0
fi

"${CMD[@]}"
echo "Publish finished."
