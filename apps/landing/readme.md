# Longrunner Landing Page

A simple web-based landing page built with **Node.js**, **Express**, and **EJS** to serve as a central hub for accessing other Longrunner applications. Now running in the pnpm monorepo with ES modules.

## Live

🔗 [https://longrunner.co.uk](https://longrunner.co.uk)

Note: If the website is down, I'm probably testing or updating it.

## Features

- Centralised access to all Longrunner web apps
- Simple navigation with external links to:
  - [Shopping List App](https://slapp.longrunner.co.uk)
  - [Quiz App](https://quiz.longrunner.co.uk)
- Clean and minimal interface

## Tech Stack

- **Runtime:** Node.js (ES modules)
- **Framework:** Express + EJS
- **Database:** None (static landing page)
- **Monorepo:** pnpm workspaces

## Shared Packages

- `@longrunner/shared-utils`
- `@longrunner/shared-config`
- `@longrunner/shared-policy`
- `@longrunner/shared-ui`

## Development

```bash
pnpm install
pnpm --filter landing lint
pnpm --filter landing exec node app.js
```

Runs on port `3000`.

### Environment Variables

- `SESSION_KEY`
- `SITEKEY`
- `SECRETKEY`

## Structure

```
apps/landing/
├── app.js
├── controllers/
├── public/
├── views/
└── docs/
```

## Contributing

This project is still a work in progress. Feedback, feature requests, and contributions are welcome!
