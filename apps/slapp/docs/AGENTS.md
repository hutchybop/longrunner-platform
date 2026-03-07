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
- Use CommonJS require() syntax throughout

### Formatting & Naming
- ESLint + Prettier, ES2021, CommonJS for server files
- Controllers: camelCase functions (index, new, create)
- Models: PascalCase schemas (MealSchema, UserSchema)
- Variables: camelCase, Constants: UPPER_SNAKE_CASE

### Error Handling
- Use catchAsync wrapper for async route handlers
- Custom ExpressError class with message and statusCode
- Joi validation with flash errors via JoiFlashError

### Database & Security
- Mongoose ODM with author field for ownership
- Enum validation for constrained fields
- MongoDB sanitization middleware, Helmet security headers
