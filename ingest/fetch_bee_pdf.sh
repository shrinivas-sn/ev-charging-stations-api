#!/usr/bin/env bash
# Download BEE's "EV Public Charging Stations Data" PDF into ingest/cache/.
# BEE's HTTPS endpoint does not complete a TLS handshake from most networks, and the
# site blocks non-browser user agents, so this uses http:// with a browser UA.
set -euo pipefail

URL="${BEE_PDF_URL:-http://beeindia.gov.in/WriteReadData/RTF1984/EV_PCS_Data_29277.pdf}"
DIR="$(cd "$(dirname "$0")" && pwd)/cache"
OUT="$DIR/$(basename "$URL")"

mkdir -p "$DIR"
curl -fsSL --retry 3 --retry-delay 5 -m 300 -A "Mozilla/5.0" -o "$OUT.part" "$URL"

if [ "$(head -c 5 "$OUT.part")" != "%PDF-" ]; then
  echo "download is not a PDF (BEE may have returned an HTML page): $URL" >&2
  rm -f "$OUT.part"
  exit 1
fi

mv "$OUT.part" "$OUT"
sha256sum "$OUT"
