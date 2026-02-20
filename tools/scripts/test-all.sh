#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

(cd packages/streaming-markdown && bash scripts/run-tests.sh)
