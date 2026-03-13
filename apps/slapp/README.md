# Shopping List App

Express app for meal planning and shopping list generation at `slapp.longrunner.co.uk`, running in the Longrunner pnpm monorepo with ES modules and shared workspace packages.

## Live

🔗 [https://slapp.longrunner.co.uk](https://slapp.longrunner.co.uk)

## Features

- User auth: register, login, logout, forgot/reset password, account delete
- Meal creation and recipe/ingredient management
- Weekly planning and shopping list generation
- Category-based shopping list organization
- Shared security and validation stack across apps

## Tech Stack

- **Runtime:** Node.js (ES modules)
- **Framework:** Express + EJS (`ejs-mate` layouts)
- **Database:** MongoDB + Mongoose
- **Monorepo:** pnpm workspaces

## Shared Packages

- `@longrunner/shared-auth`
- `@longrunner/shared-utils`
- `@longrunner/shared-middleware`
- `@longrunner/shared-schemas`
- `@longrunner/shared-config`
- `@longrunner/shared-policy`
- `@longrunner/shared-ui`

## Development

```bash
pnpm install
pnpm --filter shoppinglist lint
pnpm --filter shoppinglist exec node app.js
```

Runs on port `3001`.

### Environment Variables

- `MONGODB`
- `SESSION_KEY`
- `SITEKEY`
- `SECRETKEY`
- `EMAIL_USER`
- `ALIAS_EMAIL`
- `ZOHOPW`

## Structure

```
apps/slapp/
├── app.js
├── controllers/
├── models/
├── public/
├── utils/
├── views/
└── docs/
```

Auth and policy templates/assets are consumed from shared packages at runtime.
