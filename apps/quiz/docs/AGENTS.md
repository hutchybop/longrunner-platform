# AGENTS.md

## Commands

- **Lint**: `npm run lint` (ESLint with Prettier integration)
- **Lint fix**: `npm run lint:fix` (Auto-fix linting issues)
- **Start**: `node app.js` (Starts server on port 3002)
- No test framework configured

## Code Style Guidelines

### Import Organization

- External imports first (express, mongoose, etc.)
- Local imports second (relative paths with ./)
- Group related imports together

### Formatting & Linting

- Uses ESLint 9 with Prettier integration
- ES2021 syntax
- CommonJS modules (require/module.exports) for Node.js files
- ES modules for browser/public JavaScript files
- EJS templates are ignored by linter

### Naming Conventions

- camelCase for variables and functions
- PascalCase for models (Quiz, Question)
- kebab-case for routes and file names
- Descriptive function names (lobbyNewPost, catchAsync)

### Error Handling

- Use catchAsync wrapper for async route handlers
- Custom ExpressError class for structured errors
- Centralized error handler in utils/errorHandler.js
- Flash messages for user feedback

### Database & Security

- Mongoose ODM with MongoDB
- Mongo sanitization middleware enabled
- Helmet for security headers
- Session-based authentication with MongoStore

### File Structure

- Controllers in /controllers (route handlers)
- Models in /models (Mongoose schemas)
- Utils in /utils (middleware, helpers)
- Public assets in /public (CSS, JS, images)
- Views in /views (EJS templates)
