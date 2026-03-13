# AGENTS.md - Longrunner Platform

This file is for coding agents working in `longrunner-platform`.
Follow these commands and conventions unless a task explicitly says otherwise.

## Repo Snapshot

- Monorepo package manager: `pnpm` workspaces.
- Runtime: Node.js, Express, EJS, MongoDB/Mongoose.
- Module system: ES modules (`"type": "module"`) across apps/packages.
- Main apps:
  - `apps/landing` (`name: landing`, port `3000`)
  - `apps/slapp` (`name: shoppinglist`, port `3001`)
  - `apps/quiz` (`name: longrunner-quiz`, port `3002`)
  - `apps/blog` (`name: ironman-blog`, port `3004`)
- Shared packages: `@longrunner/shared-auth`, `@longrunner/shared-config`, `@longrunner/shared-middleware`, `@longrunner/shared-policy`, `@longrunner/shared-schemas`, `@longrunner/shared-ui`, `@longrunner/shared-utils`.

## Install / Run / Lint / Test

### Install

- Install all workspace dependencies:
  - `pnpm install`

### Run apps locally

- Preferred (works for every app):
  - `pnpm --filter landing exec node app.js`
  - `pnpm --filter shoppinglist exec node app.js`
  - `pnpm --filter longrunner-quiz exec node app.js`
  - `pnpm --filter ironman-blog exec node app.js`
- Optional (landing only has `start` script):
  - `pnpm --filter landing start`

### Lint

- Lint a single workspace:
  - `pnpm --filter landing lint`
  - `pnpm --filter shoppinglist lint`
  - `pnpm --filter longrunner-quiz lint`
  - `pnpm --filter ironman-blog lint`
  - `pnpm --filter @longrunner/shared-utils lint`
- Lint + autofix a workspace:
  - `pnpm --filter <workspace-name> lint:fix`
- Lint all workspaces with lint scripts:
  - `pnpm -r --if-present run lint`

### Build

- There is currently **no repo-wide build script** and no per-workspace build pipeline.
- Treat lint + app boot checks as the primary verification path.

### Test

- There is currently **no automated test framework configured** (no Jest/Vitest/Playwright/node:test suite in repo).
- Some workspaces include a placeholder `test` script that exits with error.
- If you are asked to "run tests", do this instead:
  - Run lint on the changed workspace.
  - Boot the affected app and verify the edited flow manually.

### Running a single test (important)

- True single-test execution is not available yet because no test harness exists.
- Closest equivalent for targeted verification is linting one file:
  - `pnpm --filter <workspace-name> exec eslint path/to/file.js`
- If a future PR introduces `node:test` files, use:
  - `pnpm --filter <workspace-name> exec node --test path/to/file.test.js`
  - Optional test name filter: `--test-name-pattern "name fragment"`

## Code Style Rules

### Language and modules

- Use modern JavaScript only; do not introduce TypeScript unless explicitly requested.
- Use ES module syntax (`import` / `export`) everywhere.
- Server files are linted as `sourceType: "module"`.
- Browser files under `public/**/*.js` are linted as script-style globals.

### Formatting

- Formatting is enforced via ESLint + Prettier integration (`eslint-plugin-prettier/recommended`).
- Follow existing repo formatting:
  - 2-space indentation
  - semicolons
  - double quotes
  - trailing commas where Prettier applies them
- Do not hand-format against Prettier; run lint/fix when needed.

### Imports

- Keep imports grouped in this order:
  1. Node built-ins (`path`, `url`, `module`, etc.)
  2. Third-party packages (`express`, `mongoose`, etc.)
  3. Workspace packages (`@longrunner/shared-*`)
  4. Local modules (`./controllers/...`)
- Prefer workspace imports for shared code instead of relative cross-package paths.
- Include `.js` extension on local ESM imports.

### Types and data contracts

- This repo is JavaScript-first and runtime-validated.
- Enforce request/body contracts with shared Joi schemas from `@longrunner/shared-schemas`.
- Enforce persistence contracts with Mongoose schemas/models.
- Prefer explicit validation/sanitization over implicit assumptions.

### Naming conventions

- Variables/functions: `camelCase`.
- Classes/custom errors/models: `PascalCase` (for example `ExpressError`, `User`).
- Constants/env-like values: `UPPER_SNAKE_CASE`.
- Route/controller function names: verb-oriented and descriptive.
- Keep naming consistent with surrounding files before introducing new patterns.

### Error handling and async

- Wrap async route handlers with `catchAsync` from `@longrunner/shared-utils/catchAsync.js`.
- Use `ExpressError` (`@longrunner/shared-utils/ExpressError.js`) for controlled HTTP errors.
- Keep the centralized `errorHandler` middleware last in the middleware chain.
- Do not swallow errors; propagate via `next(err)` or thrown errors in async handlers.
- Preserve user-facing flash-message behavior on auth/form flows.

### Security and auth conventions

- Keep `helmet` usage via shared config helpers (`createHelmetConfig`).
- Keep session setup via shared config (`createSessionConfig`) where applicable.
- Keep Mongo sanitization in request handling paths (`express-mongo-sanitize`).
- Keep rate limiting via shared utilities (`generalLimiter`, `authLimiter`, etc.).
- Validate and sanitize user input before DB writes or auth operations.

### Shared views/assets conventions

- Shared view roots are mounted from workspace packages at runtime.
- Shared static prefixes should remain explicit (examples):
  - `/stylesheets/shared-auth`
  - `/javascripts/shared-auth`
  - `/stylesheets/shared-policy`
  - `/javascripts/shared-policy`
- For pages using shared boilerplate, pass predictable view locals (`title`, `css_page`, `js_page`).

## Cursor / Copilot Rules

- No `.cursor/rules/` directory found.
- No `.cursorrules` file found.
- No `.github/copilot-instructions.md` file found.
- Therefore, there are no additional Cursor/Copilot instruction files to merge.

## Practical Verification Checklist for Agents

- Identify touched workspace(s).
- Run `pnpm --filter <workspace> lint` for each touched workspace.
- If behavior changed, boot impacted app with `pnpm --filter <workspace> exec node app.js`.
- Manually verify edited route/view/form/auth flow.
- Report exactly what was verified and what remains unverified.
