#!/usr/bin/env bash

set -uo pipefail

pdf=${1:-cv/cv.pdf}
baseline=data/cv-baseline/cv-baseline.txt
metadata=data/cv-baseline/cv-baseline-meta.txt
failed=0

if ! pdftotext -layout "$pdf" - | diff -u "$baseline" -; then
  failed=1
fi

expected_pages=$(awk '$1 == "Pages:" { print $2 }' "$metadata")
actual_pages=$(pdfinfo "$pdf" | awk '$1 == "Pages:" { print $2 }')
if [[ ! $expected_pages =~ ^[0-9]+$ || $actual_pages != "$expected_pages" ]]; then
  printf 'Expected %s CV pages, found %s.\n' "${expected_pages:-an invalid count}" \
    "${actual_pages:-no count}" >&2
  failed=1
fi

if ((failed)); then
  printf '%s\n' \
    'The CV baseline differs: this is either a real regression or an intended change that must be recorded in data/cv-baseline/README.md.' >&2
  exit 1
fi
