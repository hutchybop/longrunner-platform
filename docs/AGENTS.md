# AGENTS.md — Longrunner Platform

This repository is a pnpm monorepo hosting two Express/Node.js applications (`blog` and `slapp`) plus shared workspaces that contain every reusable policy, auth, middleware, schema, config, and utility piece. Everything now runs as ES modules (`type": "module"`) and relies on shared packages under `packages/@longrunner/*` to avoid duplication between apps.

## Workspace Layout

```
longrunner-platform/
├── apps/
│   ├── blog/      # Ironman training blog (port 3004)
│   └── slapp/      # Shopping list planner (port 3001)
├── packages/       # Shared logic packages
│   ├── shared-auth/
│   ├── shared-policy/
│   ├── shared-middleware/
│   ├── shared-schemas/
│   ├── shared-config/
│   └── shared-utils/
├── package.json    # root workspace config
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

Both apps import shared packages via explicit workspace aliases (e.g. `@longrunner/shared-auth/auth.js`). Shared views/assets are served from packages and mounted with prefixed static routes (`/stylesheets/shared-auth`, etc.). The apps keep only domain-specific logic and layout overrides.

## Build / Lint / Test Commands

- `pnpm install` — install dependencies across all workspaces.
- `pnpm --filter ironman-blog lint` — run ESLint inside the blog app (port 3004). Emulates the usual `npm run lint` but scoped via `pnpm` to the workspace.
- `pnpm --filter shoppinglist lint` — run ESLint for the slapp app (port 3001).
- `pnpm --filter <package> exec node app.js` — start a single app in development mode (replace `<package>` with `ironman-blog` or `shoppinglist`). Example: `pnpm --filter shoppinglist exec node app.js`.
- **Running a single command**: there is no automated test framework; use the lint command as your discrete verification step for a single project.
- Manual scenarios (register/login/logout/forgot/reset/delete/policy) are performed via the browser or API calls while the app is running.

> Note: Shared packages have no standalone lint/test scripts; run app-specific commands that depend on them.

## Code Style Guidelines

These rules guide contributors and automated agents during edits.

### Module System & Imports

1. All server code uses **ES modules** with `import`/`export` and `type": "module"` at the package level.
2. Prefer absolute workspace imports for shared code: `@longrunner/shared-auth/auth.js`, `@longrunner/shared-utils/mail.js`, etc.
3. Order imports as: (1) Node built-ins (`path`, `url`), (2) third-party packages, (3) workspace/shared imports, (4) local modules.
4. Keep import paths clean and avoid `../..` when a workspace alias exists.

### Formatting

- Use Prettier defaults: 2 spaces, single quotes for JS strings (escape inner single quotes), trailing commas where allowed, and no semicolons.
- Keep lines under ~120 characters when possible; use template literals or helper variables when strings become long.
- Re-run the appropriate lint command after formatting changes to ensure the ESLint + Prettier pipeline is satisfied.

### Naming Conventions

| Kind | Convention |
|------|------------|
| Files/dirs | kebab-case (`auth-middleware.js`, `shared-auth`, `policy/cookiePolicy.ejs`) |
| Modules | PascalCase for models (`User`, `Meal`), camelCase for controllers/middleware (`createPolicyController`) |
| Constants | UPPER_SNAKE_CASE when exported/config values |
| Functions | descriptive camelCase (`validateReset`, `loginUser`) |

### Error Handling & Async Flow

1. Wrap every async route handler with `catchAsync` from `@longrunner/shared-utils/catchAsync.js`. Shared middleware factories already expose `catchAsync` when needed.
2. Use the shared `ExpressError` class in `@longrunner/shared-utils/ExpressError.js` when you need a custom status code/message.
3. Always `return next(err)` / `next(e)` once errors occur; never swallow Promise rejections.
4. In controllers, handle `req.session` carefully and avoid `res.redirect` without a flash message for UX clarity.

### Shared Views & Static Assets

- Shared XSS-sensitive templates live inside `@longrunner/shared-auth/src/views/users/` and `@longrunner/shared-policy/src/views/policy/`.
- When rendering, pass consistent locals: `title`, `css_page`, `js_page`, and `domain` to hook into shared partials.
- Serve shared assets from Express `static` middleware with explicit prefixes (`/stylesheets/shared-auth`, `/javascripts/shared-policy`).

### Shared Packages Usage

1. Prefer shared factories over app-specific duplication:
   - Use `createUserSchema({ hasRole, hasResetPasswordUsed, roleEnum })` for each app.
   - Generate controllers via `createUsersController({ domain, assetsPrefix, onRegister, onDelete })`.
2. When adding validators/middleware, update `@longrunner/shared-middleware` and re-export in apps.
3. Shared configuration (DB url, session settings, helmet CSP) come from `@longrunner/shared-config`.

### Security & Validation

- Always validate user input via shared Joi schemas from `@longrunner/shared-schemas`.
- Sanitize user-generated HTML/text; the shared schema extension already enforces `escapeHTML` for string fields.
- Sessions rely on `MongoStore` via `createSessionConfig`; do not bypass or rebuild session objects manually.

### Documentation & Readme

- App-level README files now highlight their place in the monorepo (ESM, shared packages, ports 3004/3001).
- Update the root `README.md` if you add new apps/packages or change the shared-package contract.

### Git / Workspace Hygiene

- Keep `apps/*/views/users` and `apps/*/views/policy` empty (shared views should be consumed via runtime stacking).
- Prefer workspace scripts when updating dependencies to keep `pnpm-lock.yaml` consistent.
- Don’t check in `.env` files; use `.env.example` if needed.

## Cursor and Copilot Rules

- No `.cursor` or `.cursorrules` directories exist in the repo.
- There is no `.github/copilot-instructions.md`, so nothing further is required for Copilot.

## Summary for Agents

1. Run `pnpm --filter <app> lint` as your single-command verification after edits.
2. Always import shared logic via `@longrunner/...` aliases and avoid repeating shared templates/assets inside apps.
3. Follow the schema/middleware factories so new validation rules remain centralized.
4. Every change should keep lint passing and apps bootable (use `pnpm --filter ... exec node app.js`).
5. When documenting, mention the monorepo and ES modules status so future agents stay aligned.
