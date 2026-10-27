# Node, npm, pnpm Update Guide

Use this whenever you want Mac + Docker/GHCR builds on the same versions.

---

## 1) Check current versions

```bash
node -v
npm -v
pnpm -v
```

---

### 2) Update Node with the latest stable version of npm

```bash
nvm install --lts
```

---

### 3) Update pnpm

First check the latest version of pnpm is compatible with node
```bash
npm view pnpm@latest version engines
```

This should show an output like this:
```bash
version = '12.15.0'    # The latest pnpm version available
engines = { node: '>=18' }    # The minimum node version required
```

If the minimum node version is required is lower than the current installed version `node -v` then proceed:
```bash
npm pkg set packageManager="pnpm@<pnpm version>"
corepack enable
corepack prepare pnpm@<pnpm version> --activate
hash -r
pnpm -v    # Important, required to install the version
```

---

### 4) Comfirm installed versions

```bash
node -v
npm -v
pnpm -v
```

---

## 5) Set target versions in repo (single source of truth)

Update these together:

- `.node-version` (Node)
- `package.json`:
  - `packageManager` (pnpm)
  - `engines.node`
  - `engines.npm`
  - `engines.pnpm`
- `Dockerfile`:
  - `ARG NODE_VERSION=...`
  - `ARG PNPM_VERSION=...`
  - `ARG NPM_VERSION=...`

---

## 6) Ensure Docker + GHCR builds use same versions

Confirm workflow has `resolve_node_versions: true` in `.github/workflows/docker-release.yml`.

---

## 7) Check outdated packages (pnpm)

```bash
pnpm outdated -r
```

---

## 8) Update all packages

Latest versions across workspace:
**N.B: Check with AI if unsure**

```bash
pnpm -r up --latest
pnpm install
```

---

## 9) Update individual package(s)

At workspace root:

```bash
pnpm up <package-name>@latest
```

For one workspace only:

```bash
pnpm --filter <workspace-name> up <package-name>@latest
```

Example:

```bash
pnpm --filter @longrunner/shared-config up eslint@latest
```

---

## 10) Final quick check before commit

```bash
node -v
npm -v
pnpm -v
pnpm install
git status
```
