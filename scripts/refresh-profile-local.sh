#!/usr/bin/env bash
# Update public GitHub profile assets without GitHub Actions.
set -Eeuo pipefail

script_path="$(readlink -f -- "${BASH_SOURCE[0]}")"
repo_dir="$(cd -- "$(dirname -- "$script_path")/.." && pwd -P)"
cd -- "$repo_dir"

if [[ "$(git branch --show-current)" != main ]]; then
  echo 'ERROR: use a dedicated checkout on main; no checkout was changed.' >&2
  exit 1
fi

origin="$(git remote get-url origin)"
if [[ ! "$origin" =~ github\.com[:/]Karnalito/Karnalito(\.git)?$ ]]; then
  echo 'ERROR: origin must be Karnalito/Karnalito; refusing to publish elsewhere.' >&2
  exit 1
fi

lock_dir="${XDG_CACHE_HOME:-$HOME/.cache}/karnalito-profile"
mkdir -p -- "$lock_dir"
exec 9>"$lock_dir/refresh.lock"
if ! flock -n 9; then
  echo 'Another profile refresh is running; skipping.'
  exit 0
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo 'ERROR: tracked changes exist. Use a dedicated clean checkout.' >&2
  exit 1
fi

for bin in node git flock; do
  command -v "$bin" >/dev/null || { echo "ERROR: missing $bin" >&2; exit 1; }
done
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' || {
  echo 'ERROR: Node.js >= 20 required.' >&2
  exit 1
}

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  command -v gh >/dev/null || { echo "ERROR: missing gh or GITHUB_TOKEN" >&2; exit 1; }
  GITHUB_TOKEN="$(gh auth token 2>/dev/null)" || {
    echo 'ERROR: gh is not authenticated. Run gh auth login (no token is printed).' >&2
    exit 1
  }
  export GITHUB_TOKEN
fi

# Fail before rendering if the default branch has changed non-fast-forward.
git pull --ff-only --quiet origin main
node --test scripts/render-contributions.test.mjs scripts/version-contributions.test.mjs
node scripts/render-contributions.mjs
node scripts/version-contributions.mjs

git add -- README.md assets/contributions-dark.svg assets/contributions-light.svg
if git diff --cached --quiet; then
  echo 'Profile artwork already up to date.'
  exit 0
fi

# Keep periodic refresh commits separate from the profile owner's contribution count.
git -c user.name='profile-dashboard[bot]' \
    -c user.email='profile-dashboard-bot@users.noreply.github.com' \
    commit --quiet -m 'chore(profile): refresh activity SVGs [skip ci]'

if ! git push origin HEAD:main; then
  echo 'ERROR: push rejected. Local generated commit preserved; inspect before retrying.' >&2
  exit 1
fi

echo 'Profile contribution artwork published successfully.'
