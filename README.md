# Longrunner Platform Monorepo

pnpm workspace monorepo for Longrunner applications, migrated to ES modules with shared packages for auth, policy, middleware, schemas, config, and utilities.

## Apps

| App               | Directory      | Port | Description                                                      |
| ----------------- | -------------- | ---- | ---------------------------------------------------------------- |
| `landing`         | `apps/landing` | 3000 | Landing page linking to other apps, policy pages                 |
| `shoppinglist`    | `apps/slapp`   | 3001 | Meal planner, ingredient catalog, weekly shopping list generator |
| `longrunner-quiz` | `apps/quiz`    | 3002 | General knowledge quiz with real-time multiplayer via Socket.io  |
| `ironman-blog`    | `apps/blog`    | 3004 | Ironman training blog with reviews and admin moderation          |

## Packages

- `@longrunner/shared-auth` - shared auth utils, user model/controller factories, shared auth views/assets
- `@longrunner/shared-policy` - shared policy controller, policy views/assets
- `@longrunner/shared-middleware` - shared auth middleware factory
- `@longrunner/shared-schemas` - shared Joi schemas
- `@longrunner/shared-config` - shared db/session/helmet config helpers
- `@longrunner/shared-utils` - shared mail, flash, async wrapper, errors, rate limiters
- `@longrunner/shared-ui` - boilerplate helper for meta tags, navbar/footer, shared EJS partials

## Workspace Layout

```
longrunner-platform/
├── apps/
│   ├── blog/         (port 3004)
│   ├── landing/      (port 3000)
│   ├── quiz/        (port 3002)
│   └── slapp/       (port 3001)
├── packages/
│   ├── shared-auth/
│   ├── shared-config/
│   ├── shared-middleware/
│   ├── shared-policy/
│   ├── shared-schemas/
│   ├── shared-ui/
│   └── shared-utils/
├── docs/
│   ├── AGENTS.md
│   ├── ARCHITECTURE_REFERENCE.md
│   └── DEVELOPMENT_LOG.md
├── package.json
└── pnpm-workspace.yaml
```

## Development

```bash
# Install dependencies
pnpm install

# Lint apps
pnpm --filter landing lint
pnpm --filter shoppinglist lint
pnpm --filter longrunner-quiz lint
pnpm --filter ironman-blog lint

# Run apps
pnpm --filter landing exec node app.js
pnpm --filter shoppinglist exec node app.js
pnpm --filter longrunner-quiz exec node app.js
pnpm --filter ironman-blog exec node app.js
```

## Environment

All apps expect environment variables such as:

- `MONGODB`
- `SESSION_KEY`
- `SITEKEY`
- `SECRETKEY`
- `EMAIL_USER`
- `ALIAS_EMAIL`
- `ZOHOPW`

## Core Technologies

- Express 5.x with ES modules
- MongoDB/Mongoose ODM (per-app databases)
- Socket.io for real-time quiz multiplayer
- EJS templating with ejs-mate
- Session auth with MongoStore
- Security: helmet, express-mongo-sanitize, express-rate-limit, recaptcha
