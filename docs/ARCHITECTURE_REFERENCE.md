# Architecture Reference - Longrunner

This document provides a comprehensive technical reference for the Longrunner project, a monorepo containing multiple Express.js applications.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Flow](#architecture-flow)
3. [File/Module Inventory](#filemodule-inventory)
4. [Dependency Map](#dependency-map)
5. [Data Flow](#data-flow)
6. [Key Interactions](#key-interactions)
7. [Extension Points](#extension-points)

---

## System Overview

Longrunner is a monorepo hosting **five independent Express.js applications** that share similar patterns and conventions but serve different purposes:

| App | Directory | Port | Purpose |
|-----|-----------|------|---------|
| **app-blog** | `apps/blog/app-blog` | 3004 | Ironman blog with user reviews, admin dashboard, IP blocking |
| **app-slapp** | `apps/slapp/app-slapp` | 3001 | Shopping list app with meals, ingredients, categories |
| **app-quiz** | `apps/quiz/app-quiz` | 3002 | Real-time quiz application with Socket.io |
| **app-landing** | `apps/landing/app-landing` | 3000 | Static landing page |
| **app-voxmate_api** | `apps/voxmate_api/app-voxmate_api` | 3003 | Smart speaker API integration |

### Core Technologies

- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose ODM
- **Templating**: EJS with ejs-mate for layouts
- **Authentication**: Custom session-based auth with bcrypt password hashing
- **Security**: helmet, express-mongo-sanitize, sanitize-html, express-rate-limit
- **Sessions**: express-session with MongoStore

---

## Architecture Flow

### Request-Response Flow

```mermaid
flowchart TD
    Client[Client Browser] -->|HTTP Request| Express[Express Server]
    
    subgraph Middleware_Chain ["Middleware Chain"]
        Direction TB
        Favicon[Favicon Handler]
        Helmet[Helmet Security Headers]
        MongoSanitize[Mongo Sanitize]
        Session[Session Middleware]
        Flash[Flash Messages]
        Auth[Auth Middleware]
        RateLimit[Rate Limiter]
        Compression[Compression]
    end
    
    Express --> Middleware_Chain
    
    subgraph Router ["Router"]
        Route1[Route Matching]
        Validate[Validation Middleware]
        Controller[Controller Handler]
    end
    
    Middleware_Chain --> Router
    
    subgraph Data_Layer ["Data Layer"]
        Model[Mongoose Models]
        DB[(MongoDB)]
    end
    
    Router --> Model
    Model --> DB
    
    DB -->|Response Data| View[View/Template Rendering]
    Model -->|JSON/API Response| Client
    
    View -->|HTML Response| Client
```

### Application Structure Pattern

All apps follow MVC-like patterns:

```
app.js              # Entry point, middleware setup, routes
/controllers/       # Route handlers (logic)
/models/            # Mongoose schemas
/utils/             # Middleware and helpers
/views/             # EJS templates
/public/            # Static assets (CSS, JS, images)
```

---

## File/Module Inventory

### Core Entry Points

| File | App | Purpose |
|------|-----|---------|
| `app.js` | blog | Main entry, 389 lines - full middleware stack, all routes |
| `app.js` | slapp | Main entry, 466 lines - shopping list with meals |
| `app.js` | quiz | Main entry, 303 lines - includes Socket.io setup |
| `app.js` | landing | Main entry, 165 lines - minimal static site |
| `app.js` | voxmate_api | Main entry, 187 lines - API endpoints |

### Models (by App)

#### app-blog/models/
| File | Purpose | Key Exports |
|------|---------|--------------|
| `user.js` | User schema with password auth | `User` model, `register()`, `authenticate()`, `setPassword()` |
| `blogIM.js` | Blog posts | `BlogIM` model |
| `review.js` | Blog post reviews | `Review` model |
| `blockedIP.js` | IP blocking | `BlockedIP` model |
| `tracker.js` | Request tracking | `Tracker` model |
| `schemas.js` | Reusable schema portions | Various Schema helpers |

#### app-slapp/models/
| File | Purpose | Key Exports |
|------|---------|--------------|
| `user.js` | User schema | `User` model |
| `shoppingList.js` | Weekly shopping lists | `ShoppingList` model |
| `meal.js` | Meal definitions with ingredients | `Meal` model, `mealType`, `defaults` |
| `ingredient.js` | Ingredients | `Ingredient` model |
| `category.js` | Ingredient categories | `Category` model |
| `Log.js` | Activity logging | `Log` model |
| `schemas.js` | Reusable schemas | Schema helpers |

#### app-quiz/models/
| File | Purpose | Key Exports |
|------|---------|--------------|
| `quiz.js` | Quiz sessions | `Quiz` model |
| `question.js` | Quiz questions | `Question` model |
| `schemas.js` | Reusable schemas | Schema helpers |

#### app-voxmate_api/models/
| File | Purpose | Key Exports |
|------|---------|--------------|
| `user.js` | User schema | `User` model |
| `vox.js.js` | Vox data | `Vox` model |

### Controllers (by App)

#### app-blog/controllers/
| File | Routes | Purpose |
|------|--------|---------|
| `users.js` | `/auth/*` | Registration, login, password reset, account management |
| `reviews.js` | `/blogim/:id/reviews` | Review CRUD |
| `blogsIM.js` | `/blogim` | Blog post display |
| `admin.js` | `/admin/*` | Admin dashboard, posts, IP management |
| `policy.js` | `/policy/*` | T&C, cookie policy |

#### app-slapp/controllers/
| File | Routes | Purpose |
|------|--------|---------|
| `users.js` | `/auth/*` | User management |
| `meals.js` | `/meals/*` | Meal CRUD |
| `ingredients.js` | `/ingredients/*` | Ingredient CRUD |
| `shoppingLists.js` | `/shopping-lists/*` | Shopping list CRUD |
| `categories.js` | `/categories/*` | Category management |
| `policy.js` | `/policy/*` | Policy pages |

#### app-quiz/controllers/
| File | Routes | Purpose |
|------|--------|---------|
| `quiz.js` | `/quiz/*` | Quiz gameplay |
| `api.js` | `/api/*` | REST API endpoints |
| `policy.js` | `/policy/*` | Policy pages |

#### app-landing/controllers/
| File | Routes | Purpose |
|------|--------|---------|
| `longrunner.js` | `/*` | Landing page routes |
| `policy.js` | `/policy/*` | Policy pages |

#### app-voxmate_api/controllers/
| File | Routes | Purpose |
|------|--------|---------|
| `users.js` | `/users/*` | User management |
| `voxSpotify.js` | `/vox/*` | Spotify integration |

### Utilities (Shared Patterns)

| File | Purpose |
|------|---------|
| `utils/catchAsync.js` | Async error wrapper for route handlers |
| `utils/ExpressError.js` | Custom error class with status codes |
| `utils/errorHandler.js` | Central error handling middleware |
| `utils/passwordUtils.js` | Bcrypt password hashing/comparison |
| `utils/mail.js` | Nodemailer email sending |
| `utils/middleware.js` | Validation & auth middleware |
| `utils/auth.js` | Authentication helpers |

### App-Specific Utilities

#### app-blog/utils/
- `rateLimiter.js` - Rate limiting configuration
- `flash.js` - Flash message helpers
- `ipMiddleware.js` - IP info lookup
- `blockedIPMiddleware.js` - IP blocking
- `tracker.js` - Request tracking
- `contentFilter.js` - Content sanitization

#### app-slapp/utils/
- `logger.js` - Logging configuration
- `deleteUser.js` - User deletion with cleanup

#### app-quiz/utils/
- `quizChecks.js` - Quiz validation
- `middleware.js` - Quiz-specific middleware
- `logger.js` - Quiz logging

---

## Dependency Map

### Core Dependencies (All Apps)

```
express
mongoose
ejs-mate
helmet
dotenv
serve-favicon
method-override
express-mongo-sanitize
sanitize-html
express-session → connect-mongo
express-rate-limit (most apps)
joi (validation)
bcrypt (password hashing)
nodemailer (email)
```

### Per-App Dependencies

#### app-blog
- express-recaptcha (CAPTCHA)
- geoip-lite (IP geolocation)
- country-list
- express-back (navigation)
- compression

#### app-slapp
- express-recaptcha
- micro-geoip-lite
- async
- express-back
- compression

#### app-quiz
- socket.io (real-time)
- express-recaptcha
- micro-geoip-lite
- compression
- node-fetch

#### app-landing
- (minimal dependencies only)

#### app-voxmate_api
- mongoose only (API-focused)

### Dependency Graph (app-blog example)

```mermaid
flowchart TD
    app[app.js] --> express[express]
    app --> mongoose[mongoose]
    app --> ejsMate[ejs-mate]
    app --> helmet[helmet]
    app --> session[express-session]
    app --> mongoSanitize[express-mongo-sanitize]
    
    app --> controllers
    controllers --> models
    models --> mongoose
    
    app --> utils
    utils --> catchAsync
    utils --> ExpressError
    utils --> errorHandler
    utils --> passwordUtils
    utils --> mail
    
    models --> user[models/user.js]
    user --> passwordUtils
    user --> mail
```

---

## Data Flow

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Express
    participant MongoDB
    
    User->>Browser: Submit login form
    Browser->>Express: POST /auth/login
    Express->>Express: Validate input (Joi)
    Express->>MongoDB: Find user by email
    MongoDB->>Express: User document
    Express->>Express: bcrypt.compare(password, hash)
    alt Password valid
        Express->>Express: Create session
        Express->>MongoDB: Store session in MongoStore
        Express->>Browser: Set session cookie + redirect
        Browser->>User: Show dashboard
    else Password invalid
        Express->>Browser: Flash error + redirect to login
    end
```

### Blog Post Viewing Flow

```mermaid
flowchart LR
    subgraph Request
        R1[Browser Request<br/>/blogim/:id]
    end
    
    subgraph Middleware
        M1[Session]
        M2[Auth Check]
        M3[Rate Limit]
    end
    
    subgraph Controller
        C1[blogsIM.show]
    end
    
    subgraph Model
        M4[BlogIM.findById]
    end
    
    subgraph Database
        D1[(MongoDB)]
    end
    
    R1 --> M1 --> M2 --> M3 --> C1 --> M4 --> D1
    
    D1 --> M4 --> C1
    C1 -->|render blogim/show| View
    View --> Browser
```

### Shopping List Generation Flow

```mermaid
flowchart TD
    User[User Request<br/>/shopping-lists/generate] --> Auth[Auth Middleware]
    Auth --> Validate[Validate Input]
    Validate --> Controller[shoppingLists controller]
    
    Controller --> SL[Find ShoppingList]
    SL --> ME[Find all Meals]
    ME --> MI[Find Meal Ingredients]
    
    MI --> Aggregate[Aggregate Items]
    Aggregate --> Format[Format by Category]
    Format --> Render[Render EJS Template]
    Render --> Response[HTTP Response]
```

---

## Key Interactions

### User Registration (All Apps)

1. **Route**: `GET /auth/register` → renders registration form
2. **Validation**: Joi schema validates email, username, password
3. **Controller**: `users.registerPost` creates user with `User.register()`
4. **Model**: Hashes password with bcrypt, saves to MongoDB
5. **Session**: Auto-login after registration
6. **Response**: Redirect to homepage with success flash

### Password Reset Flow

1. `GET /auth/forgot` → renders forgot password form
2. `POST /auth/forgot` → validates email, generates reset token
3. **Model**: Stores `resetPasswordToken` (crypto) and `resetPasswordExpires`
4. **Mail**: Sends reset link via nodemailer
5. `GET /auth/reset/:token` → validates token, renders reset form
6. `POST /auth/reset/:token` → validates password, updates hash
7. **Model**: `user.setPassword()` hashes new password

### Admin IP Blocking (app-blog)

1. Admin accesses `/admin/blocked-ips`
2. Submits IP to block
3. Controller creates `BlockedIP` document
4. `blockedIPMiddleware` checks all requests against blocked list
5. Blocked IPs get 403 response before reaching routes

### Real-time Quiz (app-quiz)

1. Socket.io connection established on page load
2. User creates/joins lobby
3. Controller creates `Quiz` document in MongoDB
4. Socket broadcasts state to all participants
5. Questions served via REST API
6. Scores updated via Socket events

---

## Extension Points

### Adding New Features

#### 1. New Model
**Files to create**: `models/newfeature.js`
**Files to modify**: `app.js` (import if needed)

```javascript
// models/newfeature.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NewFeatureSchema = new Schema({
  name: String,
  // ... fields
});

module.exports = mongoose.model('NewFeature', NewFeatureSchema);
```

#### 2. New Controller
**Files to create**: `controllers/newfeature.js`
**Files to modify**: `app.js` (require and mount routes)

```javascript
// controllers/newfeature.js
const NewFeature = require('../models/newfeature');
const catchAsync = require('../utils/catchAsync');

module.exports.index = catchAsync(async (req, res) => {
  const items = await NewFeature.find();
  res.render('newfeature/index', { items });
});
```

#### 3. New Route
**Files to modify**: `app.js`

```javascript
// Add route
const newfeature = require('./controllers/newfeature');
app.get('/newfeature', newfeature.index);
```

#### 4. New Validation Middleware
**Files to create**: `utils/middleware.js` (add Joi schema)
**Files to modify**: Route definition

```javascript
// utils/middleware.js
module.exports.validateNewFeature = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    throw new ExpressError(error.details[0].message, 400);
  }
  next();
};
```

#### 5. New Utility
**Files to create**: `utils/newutility.js`
**Files to modify**: Any file needing the utility

### Common Extension Patterns

| Feature Type | Create | Modify |
|--------------|--------|--------|
| New database entity | `models/*.js` | `app.js` (if needed) |
| New page/route | `controllers/*.js` | `app.js` (routes) |
| New validation | `utils/middleware.js` | Route definition |
| New helper | `utils/helper.js` | Import where needed |
| New public assets | `public/` | (no code changes) |
| New template | `views/` | Controller renders it |

### Database Extension (Multi-Tenant)

Each app uses its own MongoDB database:
- **blog**: `blog` database
- **slapp**: (check `.env` or app.js)
- **quiz**: (check `.env` or app.js)
- **voxmate_api**: `voxMate_api` database

To add a new database connection in an app:

```javascript
// app.js
const dbName = "new_database";
const dbUrl = `mongodb+srv://user:${process.env.MONGODB}@host.mongodb.net/${dbName}`;
mongoose.connect(dbUrl);
```

---

## Configuration

### Environment Variables (.env)

Common variables across apps:
- `NODE_ENV` - production/development
- `MONGODB` - MongoDB connection string
- `SESSION_KEY` - Session secret
- `SITEKEY` - reCAPTCHA site key
- `SECRETKEY` - reCAPTCHA secret key
- `EMAIL_USER` - SMTP username
- `EMAIL_PASS` - SMTP password

### Running Apps

```bash
# Individual apps
cd apps/blog/app-blog && node app.js      # port 3004
cd apps/slapp/app-slapp && node app.js    # port 3001
cd apps/quiz/app-quiz && node app.js      # port 3002
cd apps/landing/app-landing && node app.js # port 3000
cd apps/voxmate_api/app-voxmate_api && node app.js # port 3003

# Linting
npm run lint      # check code style
npm run lint:fix # fix issues
```

---

## Security Notes

- All user input is sanitized with `express-mongo-sanitize` and `sanitize-html`
- Passwords hashed with bcrypt (with migration support from older format)
- Rate limiting on auth routes prevents brute force
- CSRF protection via same-site cookies
- Helmet provides security headers
- reCAPTCHA on registration/login forms

---

*Last Updated: 2026-03-01*
