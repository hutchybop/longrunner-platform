# Ironman Training Blog

Express app for long-form Ironman training content at `blog.longrunner.co.uk`, running in the Longrunner pnpm monorepo with ES modules and shared workspace packages.

## Live

🔗 [https://blog.longrunner.co.uk](https://blog.longrunner.co.uk)

## Features

- User auth: register, login, logout, forgot/reset password, account delete
- Blog post and review system with moderation and admin workflows
- Role-aware behavior (`user`/`admin`) via shared auth model factory config
- Security stack: helmet, sanitization, rate limiting, secure sessions
- Tracking and moderation helpers for suspicious review activity

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
pnpm --filter ironman-blog lint
pnpm --filter ironman-blog exec node app.js
```

Runs on port `3004`.

### Environment Variables

Set these in the root `.env.shared` file:

- `MONGODB`
- `SESSION_KEY`
- `SITEKEY`
- `SECRETKEY`
- `EMAIL_USER`
- `ALIAS_EMAIL`
- `ZOHOPW`

## Structure

```
apps/blog/
├── app.js
├── controllers/
├── models/
├── public/
├── utils/
├── views/
└── docs/
```

Auth and policy templates/assets are consumed from shared packages at runtime.
