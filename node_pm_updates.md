## Node + Package Manager Updates (Definitive Guide)

Goal: keep local Mac, Docker image builds, and GitHub Docker releases on the same `node`, `npm`, and `pnpm` versions, and avoid broken/locked pnpm installs.

---

## Important rules

1. Do **not** manage pnpm with `npm install -g pnpm`.
2. Use **Corepack** to manage pnpm.
3. Keep version pins in repo files in sync.
4. Docker/GitHub builds use repo pins, not your Mac version automatically.

---

## Canonical version sources in this repo

- Node: `.node-version`
- pnpm: `package.json` -> `packageManager`
- npm: `package.json` -> `engines.npm`
- Local Docker fallback args: `Dockerfile` (`NODE_VERSION`, `PNPM_VERSION`, `NPM_VERSION`)
- GitHub Docker release resolver: `.github/workflows/docker-release.yml` (`resolve_node_versions: true`)

---

## Step-by-step update process (Mac)

### 1) Update Node on Mac
Install Node (official installer or your preferred method), then verify:

```bash
node -v
npm -v
```

---

### 2) Clean old/broken pnpm shims (one-time or when pnpm is broken)

If `pnpm -v` is wrong or errors, remove old shim-managed pnpm first:

```bash
sudo npm uninstall -g pnpm
rm -rf "$HOME/Library/pnpm/.tools/pnpm"
hash -r
```

If your shell prepends `PNPM_HOME` and causes old shims to win, remove/disable that from `~/.zshrc`, then restart terminal.

---

### 3) Install pnpm via Corepack (recommended, stable)

```bash
corepack enable
corepack prepare pnpm@12.4.1 --activate
hash -r
```

Verify binary source and version:

```bash
which pnpm
pnpm -v
```

Expected:
- `which pnpm` points to Corepack-managed path (not stale shim path)
- `pnpm -v` matches target version

---

### 4) Update repo pins to match local intent

Update these files every time versions change:

1. `.node-version`
   - Example: `24.21.0`

2. `package.json`
   - `packageManager`: `pnpm@12.4.1`
   - `engines.node`: `>=24.21.0 <25`
   - `engines.npm`: `12.0.2` (or range)
   - `engines.pnpm`: `>=12 <13`

3. `Dockerfile`
   - `ARG NODE_VERSION=24.21.0`
   - `ARG PNPM_VERSION=12.4.1`
   - `ARG NPM_VERSION=12.0.2`

---

### 5) Verify all pins are aligned

```bash
node -v
npm -v
pnpm -v

cat .node-version
grep -n '"packageManager"' package.json
grep -n '"node"' package.json
grep -n '"npm"' package.json
grep -n '"pnpm"' package.json
grep -n 'ARG NODE_VERSION' Dockerfile
grep -n 'ARG PNPM_VERSION' Dockerfile
grep -n 'ARG NPM_VERSION' Dockerfile
```

---

### 6) Verify workspace installs cleanly

```bash
pnpm install
pnpm -r --if-present lint
```

(Optional)
```bash
pnpm -r --if-present test
```

---

### 7) Validate local Docker image versions

```bash
docker build -t longrunner-platform:test .
docker run --rm longrunner-platform:test node -v
docker run --rm longrunner-platform:test npm -v
docker run --rm longrunner-platform:test pnpm -v
```

---

### 8) Push + GitHub Docker release behavior

GitHub release image builds run on tag pushes (`v*.*.*`) and resolve versions from repo pins (`resolve_node_versions: true`), not your Mac directly.

So if the repo pins are correct and committed, CI Docker image versions will match your intended Node/npm/pnpm versions.

---

## Quick troubleshooting

### pnpm says scripts were blocked / native binary missing
Cause: installed with npm and scripts blocked.
Fix: remove npm-global pnpm and reinstall via Corepack (Steps 2 and 3).

### pnpm version wrong in one terminal but right in another
Cause: shell PATH order / stale command cache.
Fix:
```bash
hash -r
which pnpm
```
Restart terminal and ensure old `PNPM_HOME` shim path is not overriding Corepack.

### EBADENGINE warnings
Cause: local versions do not satisfy exact `engines` pins.
Fix: update `package.json` engines or local versions so they agree.

---

## Team rule (recommended)

- Use Corepack for pnpm everywhere.
- Do not use `npm install -g pnpm`.
- Treat `.node-version`, `package.json` pins, and `Dockerfile` ARGs as one change set.
- Commit version pin changes together.
