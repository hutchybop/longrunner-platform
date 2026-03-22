# Quiz Web App

Quiz application built with **Node.js**, **Express**, **EJS**, **MongoDB**, and **Socket.IO** for real-time multiplayer. Now running in the Longrunner pnpm monorepo with ES modules.

## Live

🔗 [https://quiz.longrunner.co.uk](https://quiz.longrunner.co.uk)

Note: If the website is down, I'm probably testing or updating it.

## Features

- Take quizzes with varying difficulties and question counts
- "Auto" mode automatically advances to the next question
- Multiplayer quiz mode using a shared room code (via Socket.IO)
- Real-time answer tracking and scoring (multiplayer mode may be buggy)

## Tech Stack

- **Runtime:** Node.js (ES modules)
- **Framework:** Express + EJS
- **Database:** MongoDB + Mongoose
- **Realtime:** Socket.IO for multiplayer
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
pnpm --filter longrunner-quiz lint
pnpm --filter longrunner-quiz exec node app.js
```

Runs on port `3002`.

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
apps/quiz/
├── app.js
├── controllers/
├── models/
├── public/
├── utils/
├── views/
└── docs/
```

## Contributing

This project is still a work in progress. Feedback, feature requests, and contributions are welcome!
