# Longrunner Platform Monorepo

pnpm workspace monorepo for Longrunner applications, migrated to ES modules with shared packages for auth, policy, middleware, schemas, config, and utilities.

## Apps

| App                  | Directory      | Port | Description                                                      |
| -------------------- | -------------- | ---- | ---------------------------------------------------------------- |
| `landing`            | `apps/landing` | 3000 | Landing page linking to other apps, policy pages                 |
| `shoppinglist`       | `apps/slapp`   | 3001 | Meal planner, ingredient catalog, weekly shopping list generator |
| `longrunner-quiz`    | `apps/quiz`    | 3002 | General knowledge quiz with real-time multiplayer via Socket.io  |
| `ironman-blog`       | `apps/blog`    | 3003 | Ironman training blog with reviews and admin moderation          |
| `longrunner-tracker` | `apps/tracker` | 3004 | Global IP tracking and analytics across all Longrunner apps      |

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
│   ├── blog/         (port 3003)
│   ├── landing/      (port 3000)
│   ├── quiz/        (port 3002)
│   ├── slapp/       (port 3001)
│   └── tracker/     (port 3004)
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
pnpm --filter longrunner-tracker lint

# Run apps
pnpm --filter landing exec node app.js
pnpm --filter shoppinglist exec node app.js
pnpm --filter longrunner-quiz exec node app.js
pnpm --filter ironman-blog exec node app.js
pnpm --filter longrunner-tracker exec node app.js

# Run all apps in dev
pnpm -r --parallel run dev
# Run all apps in production
pnpm -r --parallel run start
```

## Environment

All apps load variables from the root `.env.shared` file.

Core variables:

- `MONGODB`
- `SESSION_KEY`
- `SITEKEY`
- `SECRETKEY`
- `EMAIL_USER`
- `ALIAS_EMAIL`
- `ZOHOPW`

Additional app-specific variables used from `.env.shared`:

- `DEFAULT_USER_ID`
- `TRACKER_FLAG_THRESHOLD`
- `TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD`
- `TRACKER_BLOCK_30M_THRESHOLD`
- `TRACKER_BLOCK_24H_THRESHOLD`
- `TRACKER_BLOCK_30M_DURATION_MINUTES`
- `TRACKER_BLOCK_24H_DURATION_HOURS`
- `IP_WHITE_LIST`
- `TRACKER_EVENT_RETENTION_DAYS`
- `TRACKER_BLOCKED_IP_CACHE_TTL_MS`

## Core Technologies

- Express 5.x with ES modules
- MongoDB/Mongoose ODM (per-app databases)
- Socket.io for real-time quiz multiplayer
- EJS templating with ejs-mate
- Session auth with MongoStore
- Security: helmet, express-mongo-sanitize, express-rate-limit, recaptcha

## License

This monorepo and all included apps/packages are licensed under the MIT License.
See `LICENSE` at the repository root.
