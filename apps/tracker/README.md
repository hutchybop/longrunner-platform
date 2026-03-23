# Longrunner Tracker

Express app for global IP tracking and analytics across all Longrunner apps at `tracker.longrunner.co.uk`, running in the Longrunner pnpm monorepo with ES modules and shared workspace packages.

## Features

- Global IP tracking across all Longrunner apps (blog, slapp, quiz, landing)
- Admin dashboard with aggregated stats (routes, unique IPs, country breakdown)
- Route analytics (good vs bad routes per IP)
- Flagged IP detection based on configurable bad-to-good ratio thresholds
- Manual and automatic IP blocking with configurable thresholds
- Geo-location tracking (country, city)
- Session and environment tracking

## Tech Stack

- **Runtime:** Node.js (ES modules)
- **Framework:** Express + EJS (`ejs-mate` layouts)
- **Database:** MongoDB + Mongoose
- **Monorepo:** pnpm workspaces

## Shared Packages

- `@longrunner/shared-tracker`
- `@longrunner/shared-utils`
- `@longrunner/shared-config`
- `@longrunner/shared-policy`
- `@longrunner/shared-ui`

## Development

```bash
pnpm install
pnpm --filter tracker lint
pnpm --filter tracker exec node app.js
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

## Structure

```
apps/tracker/
├── app.js
├── controllers/
├── models/
├── public/
├── utils/
├── views/
└── docs/
```

Auth and policy templates/assets are consumed from shared packages at runtime.
