#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

TS_NODE_PROJECT=tests/tsconfig.json ts-node --transpile-only tests/run-tests.ts
