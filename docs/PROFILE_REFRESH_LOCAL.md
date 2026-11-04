# GitHub profile SVG refresh — Debian, no Actions

The `contributions-dark.svg` and `contributions-light.svg` files are generated from GitHub's GraphQL contribution calendar. The README `<picture>` URLs are versioned with a content hash to bypass GitHub's image cache. Animation is declarative SVG/SMIL, without JavaScript.

## Requirements

- Debian desktop with Node.js **20+**, `git`, `flock` (util-linux), `systemd --user`, and `gh` (GitHub CLI).
- A **dedicated local checkout** of `Karnalito/Karnalito` on `main`, with a clean tracked working tree. Other development checkouts are not modified.
- `gh auth login` with permission to read the profile's contributions and push to `Karnalito/Karnalito`. Run `gh auth setup-git` once, so `git push` works non-interactively.
- Do not store a token in Git, a README, or the systemd unit. `gh auth token` is read into a child environment at runtime. If the CLI's credential store is unavailable to user services, create `~/.config/karnalito-profile/env` with `GITHUB_TOKEN=...` and `chmod 600` that file; use a narrowly scoped token and rotate it regularly.

## Installation (explicit operator step)

```bash
git clone https://github.com/Karnalito/Karnalito.git ~/profile-publisher
cd ~/profile-publisher
gh auth login
gh auth setup-git
bash scripts/install-profile-timer.sh
systemctl --user start profile-activity.service
systemctl --user status profile-activity.service
systemctl --user list-timers profile-activity.timer
```

If the repository is already cloned, use that path but **do not** reuse a dirty development worktree. The installer only installs a symbolic link and user-unit files. It does not publish files until the operator manually starts the service or the timer fires. Re-run the installer after changing unit files. If the checkout is moved, reinstall the link.

## Verification

```bash
bash -n scripts/refresh-profile-local.sh scripts/install-profile-timer.sh
node --test scripts/render-contributions.test.mjs scripts/version-contributions.test.mjs scripts/refresh-profile-local.test.mjs
systemctl --user start profile-activity.service
journalctl --user -u profile-activity.service -n 80 --no-pager
git log -1 --oneline
```

Check that both assets are regenerated with the same refresh UTC timestamp, the README contains the new matching 12-hex content hash in both image URLs, and the commit was pushed. Check the live profile in light and dark mode. If caching persists, perform a hard reload and compare the URL query hash to the current README.

## Failure handling

- **No network / laptop off:** user timer waits until the next boot/login; `Persistent=true` catches missed activations once the user session starts. It cannot refresh the profile while the laptop is off.
- **Dirty worktree / non-`main` / wrong remote:** exits before writing; use a dedicated checkout.
- **Missing GitHub credentials:** authenticate using `gh auth login` and `gh auth setup-git`, or the protected environment file.
- **Failed generator/tests:** exits without publishing; examine `journalctl --user -u profile-activity.service`.
- **Rejected push:** the local commit is intentionally kept (never force-push). Investigate branch divergence and safely reconcile it before restarting.
- **Pause:** `systemctl --user disable --now profile-activity.timer`.
- **Uninstall:** disable timer, remove both user unit files and `~/.local/bin/karnalito-profile-refresh`, then `systemctl --user daemon-reload`.

## GitHub Actions migration

The old scheduled workflows are archived under `docs/archive/` and removed from `.github/workflows/` in both public and private profile repositories. No workflow is needed for SVG updates. The local service updates only the generated SVGs and their README image URLs, not source code.

Because the generator uses a rolling 365-day window, the displayed contribution count can legitimately decrease when older active days age out. The generator deliberately does **not** add a speculative extra commit to that count.
