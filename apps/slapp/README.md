# 🛒 Shopping List App

Express app for meal planning and shopping list generation at `slapp.longrunner.co.uk`, now running in the Longrunner pnpm monorepo with ES modules and shared workspace packages.

🔗 Live at: [https://slapp.longrunner.co.uk](https://slapp.longrunner.co.uk)

---

## ✨ Features

- ✅ User auth flow: register, login, logout, forgot/reset password, account delete
- 🍽️ Meal creation and recipe/ingredient management
- 📅 Weekly planning and shopping list generation
- 🗂️ Category-based shopping list organization
- 🔒 Shared security and validation stack across apps

---

## 🛠️ Tech Stack

- **Runtime:** Node.js (ES modules)
- **Framework:** Express + EJS (`ejs-mate` layouts)
- **Database:** MongoDB + Mongoose
- **Monorepo:** pnpm workspaces
- **Shared Workspace Packages:**
  - `@longrunner/shared-auth`
  - `@longrunner/shared-utils`
  - `@longrunner/shared-middleware`
  - `@longrunner/shared-schemas`
  - `@longrunner/shared-config`
  - `@longrunner/shared-policy`

---

## 🚀 Development

From repo root:

```bash
pnpm install
pnpm --filter shoppinglist lint
pnpm --filter shoppinglist exec node app.js
```

App runs on port `3001` by default.

### Required Environment Variables

- `MONGODB`
- `SESSION_KEY`
- `SITEKEY`
- `SECRETKEY`
- `EMAIL_USER`
- `ALIAS_EMAIL`
- `ZOHOPW`

---

## 📁 App Structure

```text
apps/slapp/
├── app.js
├── controllers/
├── models/
├── public/
├── utils/
├── views/
└── docs/
```

Note: auth and policy templates/assets are now consumed from shared packages at runtime.

---

## 📄 Notes

- This app is part of the Longrunner monorepo migration from duplicated app logic to shared packages.
- Keep app-specific domain logic (meals/shopping/categories) here; keep reusable cross-app logic in `packages/*`.
