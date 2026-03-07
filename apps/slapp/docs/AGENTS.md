# AGENTS.md

## Commands
- **Lint**: `npm run lint` (ESLint with Prettier)
- **Lint fix**: `npm run lint:fix`
- **Start**: `node app.js` (runs on port 3001)
- **Test**: No test framework configured

## Code Style Guidelines

### Import Organization
- External imports first (express, mongoose, etc.)
- Local imports second (controllers, models, utils)
- Use ES module import/export syntax throughout

### Formatting & Naming
- ESLint + Prettier, ES modules for server files
- Controllers: camelCase functions (index, new, create)
- Models: PascalCase schemas (MealSchema, UserSchema)
- Variables: camelCase, Constants: UPPER_SNAKE_CASE

### Error Handling
- Use `catchAsync` from `@longrunner/shared-utils/catchAsync.js` for async route handlers
- Use shared `ExpressError` from `@longrunner/shared-utils/ExpressError.js` when custom status errors are needed
- Joi validation with flash errors via JoiFlashError

### Database & Security
- Mongoose ODM with author field for ownership
- Enum validation for constrained fields
- MongoDB sanitization middleware, Helmet security headers
