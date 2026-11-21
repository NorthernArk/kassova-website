#!/bin/sh
# Verify that kassova.com is live as declared (kassova/ops#18, epic kassova/overview&17):
#   1. https://kassova.com/ answers 200 over a certificate curl trusts, and serves this
#      repository's page (its <title> is in the body);
#   2. http://kassova.com/ redirects to https (GitHub Pages "Enforce HTTPS");
#   3. https://www.kassova.com/ redirects to the apex (GitHub Pages does this when the
#      custom domain is the apex and www is a CNAME to <org>.github.io).
# Reads the site from outside, the way a visitor does. POSIX sh, curl only.
set -eu

SITE_HOST="${SITE_HOST:-kassova.com}"
EXPECT_TEXT="${EXPECT_TEXT:-<title>Kassova</title>}"
CURL="curl --silent --show-error --max-time 20 --retry 3 --retry-delay 5 --retry-all-errors"
failed=0

fail() {
  echo "FAIL: $*" >&2
  failed=1
}

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT

# 1. The apex over HTTPS.
code="$($CURL --output "$body_file" --write-out '%{http_code}' "https://${SITE_HOST}/" || true)"  # 000 when curl cannot connect
if [ "$code" != "200" ]; then
  fail "https://${SITE_HOST}/ answered ${code}, expected 200"
elif ! grep -qF "$EXPECT_TEXT" "$body_file"; then
  fail "https://${SITE_HOST}/ does not serve this site (no '${EXPECT_TEXT}' in the body)"
else
  echo "ok: https://${SITE_HOST}/ 200, serves this site"
fi

# expect_redirect URL: the first response (no redirect follow) must be a 301/302/307/308 to
# https://SITE_HOST/. An empty Location is reported as "-".
expect_redirect() {
  result="$($CURL --output /dev/null --write-out '%{http_code} %{redirect_url}' "$1" || true)"
  status="${result%% *}"
  location="${result#"$status"}"
  location="${location# }"
  location="${location:--}"
  case "$status:$location" in
    30[1278]:https://${SITE_HOST}/*) echo "ok: $1 $status -> $location" ;;
    *) fail "$1 answered $status -> $location, expected a redirect to https://${SITE_HOST}/" ;;
  esac
}

# 2. Plain HTTP goes to HTTPS.
expect_redirect "http://${SITE_HOST}/"

# 3. www goes to the apex.
expect_redirect "https://www.${SITE_HOST}/"

if [ "$failed" -ne 0 ]; then
  echo "kassova.com is not live as declared; see kassova/ops#18" >&2
  exit 1
fi
echo "kassova.com is live as declared"
