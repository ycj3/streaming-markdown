#!/usr/bin/env bash
set -euo pipefail

TS_NODE_PROJECT=tests/tsconfig.json ts-node --transpile-only tests/run-tests.ts
