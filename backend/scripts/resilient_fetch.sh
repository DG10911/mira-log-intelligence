#!/usr/bin/env bash
# Resilient single-threaded fetch for Zenodo (which drops big transfers).
# Resumes with -C - in a loop until each file reaches its expected size.
# Usage: resilient_fetch.sh KEY:EXPECTED_BYTES [KEY:BYTES ...]
set -u
RAW="/Volumes/KIOXIA/acentra-logintel/datasets/raw"
BASE="https://zenodo.org/api/records/8196385/files"
mkdir -p "$RAW"

fetch() {
  local key="$1" want="$2" dest="$RAW/$1" url="$BASE/$1/content"
  echo ">>> $key (want ${want} bytes)"
  for attempt in $(seq 1 40); do
    local have=0
    [ -f "$dest" ] && have=$(stat -f%z "$dest" 2>/dev/null || echo 0)
    if [ "$have" -ge "$want" ]; then echo "    complete ($have bytes)"; return 0; fi
    echo "    attempt $attempt: have $have / $want, resuming..."
    curl -sL --fail -C - -o "$dest" \
      --retry 5 --retry-all-errors --retry-delay 4 \
      --speed-limit 8000 --speed-time 25 \
      --connect-timeout 30 "$url"
    sleep 2
  done
  local final=0; [ -f "$dest" ] && final=$(stat -f%z "$dest")
  [ "$final" -ge "$want" ] && { echo "    complete"; return 0; }
  echo "    GAVE UP on $key ($final/$want)"; return 1
}

for spec in "$@"; do
  key="${spec%%:*}"; bytes="${spec##*:}"
  fetch "$key" "$bytes"
done
echo "ALL DONE"
