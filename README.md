# Longrunner Platform Monorepo

pnpm workspace monorepo for Longrunner applications, migrated to ES modules with shared packages for auth, policy, middleware, schemas, config, and utilities.

## Apps

- `apps/blog` - Ironman training blog (`blog.longrunner.co.uk`)
- `apps/slapp` - Shopping list app (`slapp.longrunner.co.uk`)

## Packages

- `@longrunner/shared-auth` - shared auth utils, user model/controller factories, shared auth views/assets
- `@longrunner/shared-policy` - shared policy controller, policy views/assets
- `@longrunner/shared-middleware` - shared auth middleware factory
- `@longrunner/shared-schemas` - shared Joi schemas
- `@longrunner/shared-config` - shared db/session/helmet config helpers
- `@longrunner/shared-utils` - shared mail, flash, async wrapper, errors, rate limiters

## Workspace Layout

```text
longrunner-platform/
├── apps/
│   ├── blog/
│   └── slapp/
├── packages/
│   ├── shared-auth/
│   ├── shared-config/
│   ├── shared-middleware/
│   ├── shared-policy/
│   ├── shared-schemas/
│   └── shared-utils/
├── package.json
└── pnpm-workspace.yaml
```

## Development

```bash
pnpm install

# lint each app
pnpm --filter ironman-blog lint
pnpm --filter shoppinglist lint

# run apps
pnpm --filter ironman-blog exec node app.js
pnpm --filter shoppinglist exec node app.js
```

## Environment

Both apps expect environment variables such as:

- `MONGODB`
- `SESSION_KEY`
- `SITEKEY`
- `SECRETKEY`
- `EMAIL_USER`
- `ALIAS_EMAIL`
- `ZOHOPW`

## Migration Notes

- Phase 1-4 migration is complete in code structure.
- Auth and policy templates/assets are now shared and mounted at runtime from workspace packages.
- App folders now primarily hold app-specific domain logic; reusable logic lives in `packages/*`.
