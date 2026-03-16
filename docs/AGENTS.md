# AGENTS.md - Longrunner Platform

This file is for coding agents working in `longrunner-platform`.
Follow these commands and conventions unless a task explicitly says otherwise.

## Repo Snapshot

- Monorepo package manager: `pnpm` workspaces.
- Runtime: Node.js, Express, EJS, MongoDB/Mongoose.
- Module system: ES modules (`"type": "module"`) across apps/packages.
- Main apps:
  - `apps/landing` (`name: landing`, port `3000`)
  - `apps/slapp` (`name: slapp`, port `3001`)
  - `apps/quiz` (`name: quiz`, port `3002`)
  - `apps/blog` (`name: blog`, port `3003`)
  - `apps/tracker` (`name: tracker`, port `3004`)
- Shared packages: `@longrunner/shared-auth`, `@longrunner/shared-config`, `@longrunner/shared-middleware`, `@longrunner/shared-policy`, `@longrunner/shared-schemas`, `@longrunner/shared-ui`, `@longrunner/shared-utils`, `@longrunner/shared-tracker`.

## Shared Packages Overview

- `@longrunner/shared-config` - Configuration helpers (`createMongoConfig`, `createHelmetConfig`, `createSessionConfig`, ESLint config)
- `@longrunner/shared-utils` - Utilities (`catchAsync`, `ExpressError`, `errorHandler`, rate limiters, flash helpers)
- `@longrunner/shared-schemas` - Joi validation schemas for request payloads
- `@longrunner/shared-auth` - Authentication middleware and helpers
- `@longrunner/shared-middleware` - Shared Express middleware
- `@longrunner/shared-policy` - Policy pages and assets
- `@longrunner/shared-ui` - Shared UI components and styling
- `@longrunner/shared-tracker` - Tracker-specific functionality

## Environment Setup

- This repo requires a `.env` file to run. Check existing examples or the app's documentation for required environment variables (database connection, session secrets, etc.).
- Install all workspace dependencies:
  - `pnpm install`

### Run apps locally

- Preferred (works for every app):
  - `pnpm --filter landing exec node app.js`
  - `pnpm --filter slapp exec node app.js`
  - `pnpm --filter quiz exec node app.js`
  - `pnpm --filter blog exec node app.js`
  - `pnpm --filter tracker exec node app.js`
- Optional (landing only has `start` script):
  - `pnpm --filter landing start`

### Lint

- Lint a single workspace:
  - `pnpm --filter landing lint`
  - `pnpm --filter slapp lint`
  - `pnpm --filter quiz lint`
  - `pnpm --filter blog lint`
  - `pnpm --filter tracker lint`
  - `pnpm --filter @longrunner/shared-utils lint`
- Lint + autofix a workspace:
  - `pnpm --filter <workspace-name> lint:fix`
- Lint all workspaces with lint scripts:
  - `pnpm -r --if-present run lint`

### Test

- There is currently **no automated test framework configured** (no Jest/Vitest/Playwright/node:test suite in repo).
- Most workspaces include a placeholder `test` script that exits with error.
- If you are asked to "run tests", do this instead:
  - Run lint on the changed workspace.
  - Boot the affected app and verify the edited flow manually.
- If a future PR introduces `node:test` files, run a single test with:
  - `pnpm --filter <workspace> exec node --test path/to/file.test.js`
  - With test name filter: `--test-name-pattern "name fragment"`

## Code Style Rules

### Language, modules, and ESLint

- Use modern JavaScript only; do not introduce TypeScript unless explicitly requested.
- Use ES module syntax (`import` / `export`) everywhere.
- Server files are linted as ES modules (`sourceType: "module"`).
- Browser files under `public/**/*.js` are linted as scripts with browser globals (`document`, `window`, `localStorage`).
- Console logging is allowed (`no-console: off`) in both contexts.
- ESLint config is defined in `@longrunner/shared-config/src/eslint.js` via `createAppEslintConfig()`.

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

### Database and Mongoose patterns

- Define Mongoose schemas in dedicated files under `models/` or `src/models/`.
- Use the shared connection utility from `@longrunner/shared-config` for MongoDB connections.
- Follow existing model patterns: schema definition → model export → index re-export.
- Avoid hardcoding connection strings; use environment variables.

### Formatting

- Use **two-space indentation** and Unix line endings.
- Keep lines under ~100 characters; split long template literals or chained calls across multiple lines.
- Prefer **template strings** over concatenation for multi-part text.
- Use **trailing commas** for multi-line objects/arrays to minimize diff noise.
- Preserve existing spacing for JSX/EJS templates; align attributes vertically for readability.
- Avoid introducing Prettier plugins; the base Prettier config handles formatting.

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

### File and directory organization

- Follow the existing structure in each app:
  - `app.js` - main entry point
  - `models/` - Mongoose schemas and models
  - `controllers/` - route handlers
  - `routes/` - Express router definitions
  - `middleware/` - custom middleware
  - `public/` - static assets (browser JS in `public/javascripts/`, CSS in `public/stylesheets/`)
  - `views/` - EJS templates
- Keep related logic co-located; avoid creating deep nesting.

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

### EJS templates

- Keep view logic in `views/` with EJS templates.
- Use consistent locals like `title`, `css_page`, and `js_page` when relying on shared layouts.
- Keep templates focused on presentation; move complex logic to controllers/helpers.

### Logging

- Logging is allowed (`no-console` is disabled in ESLint).
- Keep messages clear and descriptive.
- Avoid logging sensitive data (passwords, tokens, secrets).
- Use shared flash messaging helpers for user feedback instead of raw alerts.

## Cursor / Copilot Rules

- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` files found.

## Practical Verification Checklist for Agents

- Identify touched workspace(s) → run `pnpm --filter <workspace> lint`.
- If behavior changed, boot impacted app with `pnpm --filter <workspace> exec node app.js`.
- Manually verify edited route/view/form/auth flow.
