# AGENTS.md - Longrunner Platform

Coding agents should follow these commands and conventions.

## Repo Structure

- **Package manager**: pnpm workspaces
- **Runtime**: Node.js, Express, EJS, MongoDB/Mongoose
- **Module system**: ES modules (`"type": "module"`)
- **Apps**: `landing` (3000), `slapp` (3001), `quiz` (3002), `blog` (3003), `tracker` (3004)
- **Shared packages**: `@longrunner/shared-{auth,config,middleware,policy,schemas,ui,utils,tracker}`

## Environment Setup

1. Copy `.env.shared.example` to `.env.shared` with required credentials
2. Run `pnpm install`
3. Node.js version: `24.14.0`

## Dependencies

- Add to specific app/package, not root: `pnpm add <package> --filter <workspace>`
- Workspace dependencies use `workspace:*` protocol

## Commands

### Running Apps

```
pnpm --filter <app> exec node app.js   # e.g., tracker, blog, quiz
pnpm --filter <app> run dev             # with nodemon
pnpm --filter <app> run start           # production
```

### Linting

```
pnpm --filter <workspace> lint          # lint single workspace
pnpm --filter <workspace> lint:fix      # auto-fix
pnpm -r --if-present run lint           # all workspaces
```

### Testing

- No test framework configured. Run lint + boot app manually for verification.
- If `node --test` is added later:

```
pnpm --filter <workspace> exec node --test path/to/file.test.js
pnpm --filter <workspace> exec node --test --test-name-pattern "name" path/to/file.test.js
```

## Code Style

### Language & Modules

- JavaScript only (no TypeScript unless requested)
- ES modules (`import`/`export`) everywhere
- Browser JS in `public/**/*.js`: use `sourceType: "script"`
- `no-console` disabled (logging allowed)

### Imports (order matters)

1. Node built-ins (`path`, `url`, `module`)
2. Third-party (`express`, `mongoose`)
3. Workspace packages (`@longrunner/shared-*`)
4. Local modules (`./controllers/...`)
5. Include `.js` extension on local ESM imports

### Formatting

- Two-space indentation, Unix line endings
- Lines under ~100 characters
- Use template strings over concatenation
- Trailing commas in multi-line objects/arrays

### Naming

- Variables/functions: `camelCase`
- Classes/custom errors/models: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Route handlers: verb-oriented, descriptive
- Files: `kebab-case.js` for modules, `camelCase.js` for utilities

### Types & Data Contracts

- JavaScript-first, runtime-validated with Joi schemas (`@longrunner/shared-schemas`)
- Use Mongoose schemas for persistence
- Prefer explicit validation over implicit assumptions

### Database & Mongoose

- Schemas in `models/` or `src/models/`
- Use shared connection from `@longrunner/shared-config`
- Pattern: schema → model export → index re-export
- Never hardcode connection strings

### Error Handling

- Wrap async handlers with `catchAsync` from `@longrunner/shared-utils`
- Use `ExpressError` for controlled HTTP errors
- Keep `errorHandler` middleware last in chain
- Propagate errors via `next(err)` or thrown errors

### File Organization

```
app.js              - main entry
models/             - Mongoose schemas
controllers/        - route handlers
routes/             - Express router definitions
middleware/         - custom middleware
public/javascripts/ - browser JS
public/stylesheets/ - CSS
views/              - EJS templates
```

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
- Use `.env.shared.example` as template
- Access via `process.env.VAR_NAME` (loaded via `dotenv`)
- Validate required env vars at startup

## ESLint Configuration

Use `createAppEslintConfig` from `@longrunner/shared-config/eslint`:

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

## Verification Checklist

1. Identify touched workspace(s)
2. Run `pnpm --filter <workspace> lint`
3. If behavior changed, boot app: `pnpm --filter <workspace> exec node app.js`
4. Manually verify the edited route/view/form/auth flow
