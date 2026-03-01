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

TAG="${RELEASE_TAG:-}"
HAR_PATH="${HAR_PATH:-}"
PACKAGE_FILE="${PACKAGE_FILE:-packages/streaming-markdown/oh-package.json5}"
OHPM_RC_PATH="${OHPM_RC_PATH:-$HOME/.ohpm/.ohpmrc}"
KEY_PATH="${OHPM_KEY_PATH:-}"
PUBLISH_ID="${OHPM_PUBLISH_ID:-}"
PUBLISH_REGISTRY="${OHPM_REGISTRY:-}"

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
  verify-release.sh --tag vX.Y.Z[-pre] --har <path-to-har> [--package-file <path>]

Required environment variables:
  none (recommended to configure ~/.ohpm/.ohpmrc)

Optional project config file:
  tools/release/.release.env (or env RELEASE_ENV_FILE)
  Supported keys: HAR_PATH, PACKAGE_FILE, RELEASE_TAG

Config priority:
  1) CLI args
  2) .release.env / environment
  3) env: OHPM_PUBLISH_ID / OHPM_REGISTRY / OHPM_KEY_PATH
  4) ~/.ohpm/.ohpmrc: publish_id / publish_registry / key_path
  5) ~/.ohpm/.ohpmrc: registry (fallback for publish_registry)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      TAG="${2:-}"
      shift 2
      ;;
    --har)
      HAR_PATH="${2:-}"
      shift 2
      ;;
    --package-file)
      PACKAGE_FILE="${2:-}"
      shift 2
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

[[ -n "$TAG" ]] || { echo "Missing --tag" >&2; usage; exit 1; }
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
[[ -f "$PACKAGE_FILE" ]] || { echo "Package file not found: $PACKAGE_FILE" >&2; exit 1; }
[[ -f "$HAR_PATH" ]] || { echo "HAR file not found: $HAR_PATH" >&2; exit 1; }
[[ -n "$PUBLISH_ID" ]] || { echo "publish_id is empty (env or $OHPM_RC_PATH)" >&2; exit 1; }
[[ -n "$PUBLISH_REGISTRY" ]] || { echo "publish_registry/registry is empty (env or $OHPM_RC_PATH)" >&2; exit 1; }
[[ -n "$KEY_PATH" ]] || { echo "key_path is empty (env or $OHPM_RC_PATH)" >&2; exit 1; }
[[ -f "$KEY_PATH" ]] || { echo "Key file not found: $KEY_PATH" >&2; exit 1; }

VERSION="$(sed -nE 's/.*version:[[:space:]]*"([^"]+)".*/\1/p' "$PACKAGE_FILE" | head -n 1)"
[[ -n "$VERSION" ]] || { echo "Failed to parse version from $PACKAGE_FILE" >&2; exit 1; }

TAG_VERSION="${TAG#v}"
[[ "$TAG_VERSION" == "$VERSION" ]] || {
  echo "Tag/version mismatch: tag=$TAG_VERSION package=$VERSION" >&2
  exit 1
}

KEY_MODE="$(stat -f '%Lp' "$KEY_PATH" 2>/dev/null || true)"
if [[ -n "$KEY_MODE" && "$KEY_MODE" != "600" ]]; then
  echo "Warning: key permission is $KEY_MODE (recommended 600)"
fi

echo "PASS: ohpm command available"
echo "PASS: package version = $VERSION"
echo "PASS: release tag = $TAG"
echo "PASS: HAR file exists = $HAR_PATH"
echo "PASS: publish registry = $PUBLISH_REGISTRY"
echo "PASS: key file exists = $KEY_PATH"
echo "PASS: publish_id is set"
