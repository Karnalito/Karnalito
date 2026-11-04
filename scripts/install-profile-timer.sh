#!/usr/bin/env bash
# Explicit opt-in: install a systemd user timer; never run during tests/CI.
set -Eeuo pipefail
repo_dir="$(cd -- "$(dirname -- "$(readlink -f -- "${BASH_SOURCE[0]}")")/.." && pwd -P)"
mkdir -p -- "$HOME/.local/bin" "$HOME/.config/systemd/user"
ln -sfn -- "$repo_dir/scripts/refresh-profile-local.sh" "$HOME/.local/bin/karnalito-profile-refresh"
install -m 0644 "$repo_dir/ops/systemd/profile-activity.service" "$HOME/.config/systemd/user/profile-activity.service"
install -m 0644 "$repo_dir/ops/systemd/profile-activity.timer" "$HOME/.config/systemd/user/profile-activity.timer"
systemctl --user daemon-reload
systemctl --user enable --now profile-activity.timer
echo 'Installed timer. First manual run: systemctl --user start profile-activity.service'
