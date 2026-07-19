## Node Update Process

Goal: keep local development, Docker image builds, and CI image builds on the same Node version.

### Important limitation

Your Docker build does **not** read your Mac's installed Node version automatically.

- Local Docker uses values pinned in this repo.
- GitHub Docker release also uses pinned values in this repo.

So after updating Node on your Mac, you must update the repo pins below.

## Files to update after changing Node on your Mac

1. `.node-version:1`
   - Set to your new Node version.
   - Example: `24.18.0`

2. `package.json:7`
   - Update `engines.node`.
   - Current style is exact pin (`"24.14.0"`).
   - Recommended style to avoid patch warnings: `">=24.18.0 <25"`

3. `Dockerfile:3`
   - Update `ARG NODE_VERSION=...`
   - This is the fallback/default used by local `docker build`.

## Why these three matter

- `.node-version` is the canonical repo version for local tooling and CI version resolution.
- `package.json` engines controls pnpm engine checks/warnings.
- `Dockerfile` default ARG guarantees local Docker builds match even when no build arg is passed.

## Current CI behavior

- `.github/workflows/docker-release.yml:20` has `resolve_node_versions: true`.
- That means tagged CI Docker releases resolve versions from repo pins, not from your Mac.

## Recommended update checklist (every time Node changes)

1. Update Node on Mac.
2. Run `node -v` and note the exact version.
3. Update:
   - `.node-version:1`
   - `package.json:7`
   - `Dockerfile:3`
4. Verify consistency:
   - `node -v`
   - `grep -n '"node"' package.json`
   - `grep -n 'ARG NODE_VERSION' Dockerfile`
   - `cat .node-version`
5. Optional local Docker validation:
   - `docker build -t longrunner-platform:test .`
   - `docker run --rm longrunner-platform:test node -v`
6. Commit these version pin changes with your normal app changes.

## Quick sanity rule

After any Node upgrade, these should all represent the same major/minor/patch intent:

- local `node -v`
- `.node-version`
- `package.json` `engines.node`
- `Dockerfile` `ARG NODE_VERSION`
