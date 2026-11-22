#!/bin/sh
# Fast-forward the gh-pages branch of this GitLab project to the built site in $1 (default dist).
# A new commit on top of the current gh-pages, never a force push, so the branch history is the
# release history and the git-mirror-sync pair can carry it to GitHub. Pushes with CI_JOB_TOKEN,
# which needs "Allow Git push requests to the repository" for job tokens on this project.
set -eu

site="${1:-dist}"
: "${CI_JOB_TOKEN:?runs in GitLab CI only}"
: "${CI_SERVER_HOST:?}" "${CI_PROJECT_PATH:?}" "${CI_COMMIT_SHA:?}"
test "$(cat "$site/CNAME")" = "kassova.com" || { echo "$site/CNAME must be kassova.com" >&2; exit 1; }
test -f "$site/.nojekyll" || { echo "$site/.nojekyll is missing" >&2; exit 1; }

remote="https://gitlab-ci-token:${CI_JOB_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
git -C "$work" init --quiet
git -C "$work" remote add origin "$remote"

set +e
git -C "$work" ls-remote --exit-code --heads origin gh-pages >/dev/null
found=$?
set -e
case "$found" in
  0) git -C "$work" fetch --quiet --depth 1 origin gh-pages && git -C "$work" checkout --quiet -B gh-pages FETCH_HEAD ;;
  2) git -C "$work" checkout --quiet --orphan gh-pages; echo "gh-pages does not exist yet; starting it" ;;
  *) echo "cannot read the remote (exit $found)" >&2; exit 1 ;;
esac

find "$work" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$site"/. "$work"/
git -C "$work" add --all
if git -C "$work" diff --cached --quiet; then
  echo "gh-pages already holds this build"
  exit 0
fi
git -C "$work" -c user.name="kassova-website release" -c user.email="noreply@kassova.com" \
  commit --quiet -m "release: site built from ${CI_COMMIT_SHA}"
git -C "$work" push --quiet origin gh-pages
echo "gh-pages now holds the site built from ${CI_COMMIT_SHA}"
