#!/bin/sh
# kassova.com is the only public surface of Kassova and describes the app's features only
# (CEO 2026-11-22, kassova/ops#18 note 474248). Fails when a published file carries:
#   - an internal hostname or private address, or the app's own host;
#   - a sign-in or account surface, a form, or a script (the site is static: no app code);
#   - an API reference;
#   - a price (none is published until pricing is decided).
# Every published file is checked, README.md included (Pages serves it too); ci/ holds the
# patterns themselves and is skipped. Client and person names are not listed here, since the
# list would publish them.
# POSIX sh and grep only; run from the repository root.
set -eu

files="$(find . -path ./.git -prune -o -path ./ci -prune -o -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.txt' -o -name '*.xml' -o -name '*.json' -o -name '*.md' \) -print)"
if [ -z "$files" ]; then
  echo "No published files found" >&2
  exit 1
fi

failed=0
check() {
  label="$1"
  pattern="$2"
  # $files is a newline-separated list of paths without spaces.
  # shellcheck disable=SC2086
  if grep -InEi "$pattern" $files; then
    echo "FAIL: $label (lines above)" >&2
    failed=1
  else
    echo "ok: no $label"
  fi
}

check "internal host, address or app host" 'developerdojo\.org|focuspass\.com|focuscell\.org|taofinances\.com|hypersystem|\.svc\.cluster\.local|app\.kassova\.com|ziti|keycloak|(^|[^0-9])(10|127)\.[0-9]+\.[0-9]+\.[0-9]+|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|100\.64\.'
check "sign-in or account surface" 'sign[ -]?(in|up)|log[ -]?(in|on)|password|create an account|/auth|oauth|oidc'
check "form or script" '<form|<input|<script|javascript:'
check "API reference" '(^|[^a-z])api([^a-z]|$)|openapi|graphql|/v[0-9]+/'
check "price" '[$€£¥] ?[0-9]|[0-9] ?(usd|eur|gbp)|per (month|year|seat|user)|/mo([^a-z]|$)|pricing|free trial'

if [ "$failed" -ne 0 ]; then
  echo "A published file breaks the public-site rule (kassova/ops#18)." >&2
  exit 1
fi
echo "The published files describe features only."
