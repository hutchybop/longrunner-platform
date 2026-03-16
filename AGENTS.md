# AGENTS.md - Longrunner Platform Agent Guide

This repository hosts the Longrunner web stack. You are working across several Express/EJS apps plus shared packages. Treat this document as your mission brief for build/lint/test workflows and style expectations.

## Repo Snapshot

- Monorepo managed with `pnpm` workspaces declared in the root `package.json`.
- All workspaces target Node.js 20+ and run as ES modules (`"type": "module"`).
- Main Express apps live under `apps/` (`landing`, `slapp`, `quiz`, `blog`, `tracker`).
- Shared packages share helpers, middleware, configs, and schemas (`@longrunner/shared-*`).
- Shared ESLint config is provided via `@longrunner/shared-config/src/eslint.js` and pulled into every workspace.
- MongoDB is the persistence layer via Mongoose; Reusable Joi-style validation lives in `@longrunner/shared-schemas`.

## Environment Setup

### Install & bootstrap

- Install all dependencies once per machine: `pnpm install` (root).
- Use `pnpm -r --filter <workspace> install` only if you intentionally skip other workspaces.
- Copy or create a `.env` file for the workspace you work on. Apps expect secrets like `DATABASE_URL`, `SESSION_SECRET`, `RECAPTCHA_SITE_KEY`, etc. Look at the per-app `README.md` or `apps/*/config` utilities for exact keys.

### Runtime helpers

- Shared config helpers (`@longrunner/shared-config`) expose `createMongoConfig`, `createHelmetConfig`, `createSessionConfig`, etc. Always prefer these over duplicating middleware setups.
- Shared utilities (`@longrunner/shared-utils`) include `catchAsync.js`, `ExpressError.js`, rate limiters, flash helpers, and a centralized `errorHandler.js` that all apps wire as the final middleware.

## Build / Run / Test Commands

### Running apps

- Run a single app locally with:
  - `pnpm --filter landing exec node app.js`
  - `pnpm --filter slapp exec node app.js`
  - `pnpm --filter quiz exec node app.js`
  - `pnpm --filter blog exec node app.js`
  - `pnpm --filter tracker exec node app.js`
- Landing also exposes the conventional `start` script: `pnpm --filter landing start`.
- Those commands use the workspace `app.js` entry point and expect a connected MongoDB instance.

### Linting

- Lint a single workspace: `pnpm --filter <workspace> lint` (ex: `pnpm --filter blog lint`).
- Autofix lint errors (if safe): `pnpm --filter <workspace> lint:fix`.
- Lint every workspace that has a lint script: `pnpm -r --if-present run lint`.
- Workspace-level lint pipelines use ESLint configs built with `createAppEslintConfig` from shared-config, so rely on that file for rule details.

### Tests

- There is no automated test suite currently attached to any workspace (each `test` script fails by design).
- When asked to "run tests", run lint on touched workspace(s) and manually verify the relevant flow locally by booting the app.
- If new `node:test` suites appear, run a single file with Node’s built-in runner:
  - `pnpm --filter <workspace> exec node --test path/to/file.test.js`
- Filter a specific test name in that file with:
  - `pnpm --filter <workspace> exec node --test path/to/file.test.js --test-name-pattern "fragment"`
- Keep each test file self-contained; prefer descriptive names so filters remain readable.

## Coding Conventions

### Language & modules

- Stick to modern JavaScript (ES2022+) only. Do not introduce TypeScript without explicit direction.
- Always use ESM syntax. Local imports must include their `.js` extension.
- Use `const` for bindings that never reassign; use `let` sparingly and never try to mutate `const` objects/arrays without intent.
- Prefer optional chaining, nullish coalescing, and the `??` operator over legacy checks.
- Avoid dynamic `require` or `module.exports`; the entire repo runs with `sourceType: "module"`.

### Imports & ordering

- Follow this import order:
  1. Node built-ins (`path`, `fs`, `url`).

2.  Third-party modules (`express`, `mongoose`, `socket.io`).
3.  Shared workspace packages (`@longrunner/shared-*`).
4.  Local modules relative to the current file.

- Group and separate each section with a blank line. Keep `import { ... }` lists sorted alphabetically when reasonable.
- Favor workspace packages for shared logic (config helpers, rate limiters, schemas) rather than relative paths between packages.
- Browser assets under `public/` are linted as scripts; keep them simple and scoped to DOM interactions.

### Formatting & style

- Files use two-space indentation and Unix line endings.
- Keep lines under ~100 characters; split long template literals or chained calls across multiple lines.
- Prefer template strings over concatenation for multi-part text.
- Use trailing commas for multi-line objects/arrays to minimize diff noise, unless the surrounding style contradicts it.
- Preserve existing spacing for JSX/EJS templates; align attributes vertically for readability.

### Naming conventions

- Variables and functions: `camelCase`.
- Classes, constructors, Express error classes, and Mongoose models: `PascalCase` (e.g., `User`, `ExpressError`).
- Constants and environment variables: `UPPER_SNAKE_CASE`.
- Route/controller handlers should be verb-oriented (`renderDashboard`, `handleLoginPost`).
- Prefer descriptive names over abbreviations; mirror naming conventions already used in a folder.

### Types & validation

- Runtime validation takes priority. Use Joi schemas defined in `@longrunner/shared-schemas` before trusting request payloads.
- Always sanitize database-bound strings and query parameters via `express-mongo-sanitize`.
- Validate every body/params pair before invoking Mongoose operations.
- When you need schema variations, reuse shared Joi helpers instead of copying rules.

### Error handling & async

- All async route/controller helpers must be wrapped with `catchAsync` from `@longrunner/shared-utils/catchAsync.js`.
- Throw HTTP-aware errors with `ExpressError` whenever you need to stop a request early.
- Never swallow exceptions; forward them via `next(err)` or throw inside `catchAsync` wrappers.
- Keep the global error handler final in your middleware stack; it relies on `errorHandler` from `@longrunner/shared-utils/errorHandler.js`.
- Flash messages and localized errors must be preserved for user-facing flows.

### Database & persistence

- Define each Mongoose schema inside `models/` or `src/models/`, then export the compiled model.
- Keep connection logic centralized via `createMongoConfig` from shared-config or the shared tracker package.
- Avoid hardcoding credentials; use `process.env` variables documented in `.env.example` files.
- Reuse shared query helpers and avoid repeating population logic unless the use-case is unique.

### Shared views & assets

- Keep view logic in `views/` with EJS templates. Pass consistent locals like `title`, `css_page`, and `js_page` when you rely on shared layouts.
- Shared UI/styling lives under `@longrunner/shared-ui`; reference those CSS/JS assets via the documented static prefixes (`/stylesheets/shared-auth`, `/javascripts/shared-policy`, etc.).
- Browser scripts under `public/javascripts/` should focus on small interactive enhancements; defer heavy logic to server-rendered routes or shared UI modules.

### Security & middleware patterns

- Use the shared `createHelmetConfig`, `createSessionConfig`, and rate limiter helpers from `@longrunner/shared-config` and `@longrunner/shared-utils`.
- Keep `helmet`, session setup, and sanitizers configured before your routers mount.
- Shared rate limiters (`generalLimiter`, `authLimiter`) should guard auth-related post routes.
- Only expose necessary static routes; do not expose `/views` directly.

### Imports & exports etiquette

- Export helpers from shared packages via their defined entry points (`./catchAsync`, `./ExpressError`, etc.).
- Keep each workspace’s `app.js` as the single entry point; avoid creating alternative main files unless needed.
- When creating new utilities, add them to the shared package’s `exports` map so other workspaces can import them cleanly.

### Logging & console output

- Logging is allowed (`no-console` is disabled in ESLint) but keep messages clear and avoid logging sensitive data.
- Use shared flash messaging helpers for user feedback instead of raw alerts.

## Cursor / Copilot Rules

- There are no `.cursor/rules/` or `.cursorrules` files in this repo.
- There is no `.github/copilot-instructions.md` file either.
- Continue with the default GitHub Copilot and AGENT behavior.

## Agent Verification Checklist

1. Identify which workspace(s) a task touches.
2. Run `pnpm --filter <workspace> lint` before claiming completion.
3. Boot the affected app (`pnpm --filter <workspace> exec node app.js`) if behavior changed.
4. Manually verify the relevant route/view/form flow; comment in PR if manual steps were necessary.
5. Cite the shared helpers (catchAsync, ExpressError, shared schemas) used to fulfill the request.
