# AGENTS.md - Longrunner Platform

This file is for coding agents working in `longrunner-platform`. Follow these commands and conventions unless a task explicitly says otherwise.

## Repo Snapshot

- **Package manager**: pnpm workspaces
- **Runtime**: Node.js, Express, EJS, MongoDB/Mongoose
- **Module system**: ES modules (`"type": "module"`) across all apps/packages
- **Apps** (ports): `landing` (3000), `slapp` (3001), `quiz` (3002), `blog` (3003), `tracker` (3004)
- **Shared packages**: `@longrunner/shared-{auth,config,middleware,policy,schemas,ui,utils,tracker}`

## Shared Packages

| Package                         | Purpose                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@longrunner/shared-config`     | Config helpers (`createMongoConfig`, `createHelmetConfig`, `createSessionConfig`), ESLint config |
| `@longrunner/shared-utils`      | `catchAsync`, `ExpressError`, `errorHandler`, rate limiters, flash helpers                       |
| `@longrunner/shared-schemas`    | Joi validation schemas for request payloads                                                      |
| `@longrunner/shared-auth`       | Authentication middleware and helpers                                                            |
| `@longrunner/shared-middleware` | Shared Express middleware                                                                        |
| `@longrunner/shared-policy`     | Policy pages and assets                                                                          |
| `@longrunner/shared-ui`         | Shared UI components and styling                                                                 |
| `@longrunner/shared-tracker`    | Tracker-specific functionality                                                                   |

## Environment Setup

1. Copy `.env.shared.example` to `.env.shared` and provide required credentials
2. Run `pnpm install` to install workspace dependencies
3. Node.js version: `24.14.0` (specified in `engines`)

### Adding Dependencies

- Add to specific app/package, not root
- Use `pnpm add <package>` from workspace root (auto-links)
- Workspace dependencies use `workspace:*` protocol
- Example: `pnpm add express --filter tracker`

### Running Apps

```
pnpm --filter landing exec node app.js   # port 3000
pnpm --filter slapp exec node app.js     # port 3001
pnpm --filter quiz exec node app.js      # port 3002
pnpm --filter blog exec node app.js      # port 3003
pnpm --filter tracker exec node app.js   # port 3004
```

### Lint Commands

```
# Single workspace
pnpm --filter <workspace> lint
pnpm --filter <workspace> lint:fix        # auto-fix

# All workspaces
pnpm -r --if-present run lint

# Common: pnpm --filter tracker lint
```

### Test Commands

- **No test framework configured** (no Jest/Vitest/node.test)
- Placeholder `test` scripts exit with error
- For verification: run `pnpm --filter <workspace> lint` + boot the app manually
- If `node --test` is added later:
  ```
  pnpm --filter <workspace> exec node --test path/to/file.test.js
  pnpm --filter <workspace> exec node --test --test-name-pattern "test name" path/to/file.test.js
  pnpm --filter <workspace> exec node --test --test-only path/to/file.test.js
  ```

## Code Style Rules

### Language & Modules

- JavaScript only (no TypeScript unless explicitly requested)
- ES modules (`import`/`export`) everywhere
- Server files: `sourceType: "module"`
- Browser files in `public/**/*.js`: treated as scripts with browser globals
- `no-console` is disabled (logging allowed)

### Imports (order matters)

1. Node built-ins (`path`, `url`, `module`)
2. Third-party (`express`, `mongoose`)
3. Workspace packages (`@longrunner/shared-*`)
4. Local modules (`./controllers/...`)
5. Include `.js` extension on local ESM imports

### Formatting

- **Two-space indentation**, Unix line endings
- Lines under ~100 characters
- Use template strings over concatenation
- Trailing commas in multi-line objects/arrays
- No Prettier plugins needed

### ESLint Configuration

- Use `createAppEslintConfig` from `@longrunner/shared-config/eslint`
- Per-app config typically imports and extends the shared config:

  ```js
  import { createAppEslintConfig } from "@longrunner/shared-config/eslint";
  import js from "eslint/configs/javascript";
  import prettier from "eslint-config-prettier";
  import pluginPrettierRecommended from "eslint-plugin-prettier/recommended";

  export default [
    ...createAppEslintConfig({
      js,
      prettier,
      pluginPrettierRecommended,
      appRoot: "apps/tracker",
    }),
  ];
  ```

- Browser JS in `public/**/*.js` uses `sourceType: "script"` with browser globals
- Server JS uses `sourceType: "module"`

### Naming

- Variables/functions: `camelCase`
- Classes/custom errors/models: `PascalCase` (e.g., `ExpressError`, `User`)
- Constants: `UPPER_SNAKE_CASE`
- Route handlers: verb-oriented and descriptive
- Files: `kebab-case.js` for modules, `camelCase.js` for utilities

### Types & Data Contracts

- JavaScript-first, runtime-validated
- Enforce contracts with Joi schemas (`@longrunner/shared-schemas`)
- Enforce persistence with Mongoose schemas/models
- Prefer explicit validation over implicit assumptions

### Database & Mongoose

- Schemas in `models/` or `src/models/`
- Use shared connection from `@longrunner/shared-config`
- Pattern: schema → model export → index re-export
- Never hardcode connection strings

### Error Handling & Async

- Wrap async handlers with `catchAsync` from `@longrunner/shared-utils`
- Use `ExpressError` for controlled HTTP errors
- Keep `errorHandler` middleware last in chain
- Propagate errors via `next(err)` or thrown errors

### File Organization

```
app.js           - main entry
models/          - Mongoose schemas
controllers/     - route handlers
routes/          - Express router definitions
middleware/      - custom middleware
public/javascripts/  - browser JS
public/stylesheets/ - CSS
views/           - EJS templates
```

- Keep related logic co-located; avoid deep nesting

### Security & Auth

- Use shared config helpers: `createHelmetConfig`, `createSessionConfig`
- Use `express-mongo-sanitize` for request sanitization
- Use shared rate limiters (`generalLimiter`, `authLimiter`)
- Validate/sanitize before DB writes or auth operations

### EJS Templates

- Keep view logic in `views/` with EJS
- Use consistent locals: `title`, `css_page`, `js_page`
- Move complex logic to controllers/helpers

### Logging

- Allowed (no-console disabled)
- Keep messages clear and descriptive
- Never log sensitive data (passwords, tokens, secrets)
- Use flash messaging for user feedback

### Environment Variables

- Never commit `.env` files or secrets
- Use `.env.shared.example` as template for required variables
- Access via `process.env.VAR_NAME` (loaded via `dotenv` in shared-config)
- Validate required env vars at startup

## Cursor / Copilot Rules

- None found (no `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md`)

## Verification Checklist

1. Identify touched workspace(s)
2. Run `pnpm --filter <workspace> lint`
3. If behavior changed, boot app: `pnpm --filter <workspace> exec node app.js`
4. Manually verify the edited route/view/form/auth flow
