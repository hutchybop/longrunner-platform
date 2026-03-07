# AGENTS.md - Longrunner Repository

This repository contains multiple Express.js applications. Each app lives in `apps/` with its own dependencies and configuration.

## Repository Structure

```
apps/
├── blog/app-blog/      # Ironman blog (port 3004)
├── slapp/app-slapp/    # Shopping list app (port 3001)
├── quiz/app-quiz/      # Quiz application (port 3002)
├── voxmate_api/        # Voxmate API (port 3003)
└── landing/app-landing # Landing page (port 3000)
```

## Commands

### Running Applications

Each app can be started from its directory:
- **app-blog**: `node app.js` (port 3004)
- **app-slapp**: `node app.js` (port 3001)
- **app-quiz**: `node app.js` (port 3002)
- **app-voxmate_api**: `node app.js` (port 3003)
- **app-landing**: `node app.js` (port 3000)

### Linting

- **Lint**: `npm run lint` (ESLint with Prettier integration)
- **Lint and fix**: `npm run lint:fix`

Each app has its own ESLint configuration. Run from the specific app directory.

### Testing

**No test framework configured** in any app. Manual testing required.

---

## Code Style Guidelines

These guidelines apply to all apps in this repository.

### Import Organization

Order imports as follows:
1. Node.js built-in modules (path, fs, crypto, etc.)
2. Third-party packages (express, mongoose, etc.)
3. Local modules (controllers, models, utils)

```javascript
// Good import order
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const catchAsync = require('./utils/catchAsync');
const User = require('./models/user');
```

### Module System

- **Server files**: Use CommonJS (`require()` / `module.exports`)
- **Public/browser files**: Use ES modules (`import` / `export`)
- EJS templates are ignored by the linter

### File Structure

All apps follow MVC-like patterns:
```
app.js              # Main entry point
/controllers/        # Route handlers
/models/            # Mongoose schemas
/utils/             # Middleware and helpers
/views/             # EJS templates
/public/            # Static assets (CSS, JS, images)
```

### Naming Conventions

| Type | Convention | Examples |
|------|------------|----------|
| Files | kebab-case | `user-routes.js`, `auth-middleware.js` |
| Variables | camelCase | `currentUser`, `isAuthenticated` |
| Constants | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| Models/Schemas | PascalCase | `UserSchema`, `BlogPost` |
| Functions | camelCase, descriptive | `getUserById`, `createPost` |
| Controllers | camelCase | `index`, `new`, `create` |

### Formatting

- ESLint + Prettier integration enabled
- ES2021 syntax
- 2-space indentation (Prettier default)
- No semicolons (follows existing codebase pattern)

### Error Handling

All apps use consistent error handling patterns:

1. **catchAsync wrapper** for async route handlers:
```javascript
module.exports.catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
```

2. **Custom ExpressError class**:
```javascript
class ExpressError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
```

3. **Usage in routes**:
```javascript
router.get('/posts', catchAsync(async (req, res) => {
    const posts = await Post.find();
    res.render('posts/index', { posts });
}));
```

4. **Centralized error handler** in `utils/errorHandler.js`

### Database & Security

- **ODM**: Mongoose for MongoDB
- **Input validation**: Joi validation
- **Sanitization**: `express-mongo-sanitize` and `sanitize-html`
- **Security headers**: Helmet.js
- **Rate limiting**: `express-rate-limit`
- **Sessions**: `express-session` with MongoStore

Always sanitize user input:
```javascript
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());
```

### Async/Await Patterns

- Always use async/await, avoid callbacks
- Wrap async operations in try/catch or use catchAsync
- Handle null/undefined values explicitly:
```javascript
const count = posts && posts.length ? posts.length : 0;
```

### Template Rendering

- Use EJS templating with ejs-mate for layouts
- Pass consistent locals to all templates
- Handle undefined variables safely

### Environment Variables

- Store sensitive data in `.env` files
- Never commit `.env` files to version control
- Use `.env.example` for required variables

---

## Important Notes

- Each app has its own `package.json` - manage dependencies within the specific app directory
- Each app has its own ESLint configuration (eslint.config.mjs or .eslintrc*)
- Each app has its own port - check the app.js or AGENTS.md in each app's docs/ folder
- No automated tests - all testing is manual
