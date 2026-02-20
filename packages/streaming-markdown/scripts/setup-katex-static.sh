#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="${ROOT_DIR}/node_modules/katex/dist"
DST_DIR="${ROOT_DIR}/src/main/resources/rawfile/katex"

if [[ ! -d "${SRC_DIR}" ]]; then
  echo "KaTeX dist not found at: ${SRC_DIR}"
  echo "Install first: npm i katex@0.16.21"
  exit 1
fi

mkdir -p "${DST_DIR}"
cp -f "${SRC_DIR}/katex.min.js" "${DST_DIR}/katex.min.js"
cp -f "${SRC_DIR}/katex.min.css" "${DST_DIR}/katex.min.css"
rm -rf "${DST_DIR}/fonts"
cp -R "${SRC_DIR}/fonts" "${DST_DIR}/fonts"

echo "KaTeX static assets copied to ${DST_DIR}"
