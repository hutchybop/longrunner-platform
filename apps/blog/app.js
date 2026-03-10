// External Imports
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { mongoose } from "mongoose";
import { MongoStore } from "connect-mongo";
import mongoSanitize from "express-mongo-sanitize";
import ejsMate from "ejs-mate";
import methodOverride from "method-override";
import session from "express-session";
import back from "express-back";
import helmet from "helmet";
import compression from "compression";
import favicon from "serve-favicon";

// Setting up shared assets
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadAppEnv({ appRoot: __dirname });
const require = createRequire(import.meta.url);
const sharedAuthRoot = path.resolve(
  path.dirname(require.resolve("@longrunner/shared-auth/user.js")),
  "..",
  "..",
);
const sharedPolicyRoot = path.resolve(
  path.dirname(require.resolve("@longrunner/shared-policy")),
  "..",
);
const sharedUiRoot = path.resolve(
  path.dirname(require.resolve("@longrunner/shared-ui")),
  "..",
);

// Required for recaptcha
const { RecaptchaV2: Recaptcha } = await import("express-recaptcha");
const recaptcha = new Recaptcha(process.env.SITEKEY, process.env.SECRETKEY, {
  callback: "cb",
});

// Local imports
import {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  formSubmissionLimiter,
} from "@longrunner/shared-utils/rateLimiter.js";
import {
  createMongoDbUrl,
  createSessionConfig,
  createHelmetConfig,
  loadAppEnv,
} from "@longrunner/shared-config";
import { authenticateUser, loginUser } from "@longrunner/shared-auth/auth.js";
import flash from "@longrunner/shared-utils/flash.js";
import catchAsync from "@longrunner/shared-utils/catchAsync.js";
import { errorHandler } from "@longrunner/shared-utils/errorHandler.js";
import * as users from "./controllers/users.js";
import * as reviews from "./controllers/reviews.js";
import * as blogsIM from "./controllers/blogsIM.js";
import * as admin from "./controllers/admin.js";
import * as policy from "./controllers/policy.js";
import User from "./models/user.js";
import {
  validateTandC,
  validateLogin,
  validateRegister,
  validateForgot,
  validateReset,
  validateDetails,
  validateDelete,
  isLoggedIn,
  populateUser,
  validateReview,
  isReviewAuthor,
  isAdmin,
} from "./utils/middleware.js";
import { boilerplateHelper } from "@longrunner/shared-ui/boilerplateHelper.js";

// Setting up the app
const app = express();
app.locals.User = User;

// If in production, tells express about nginx proxy
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Setting Mongodb Atlas
const dbName = "blog";
const dbUrl = createMongoDbUrl({ dbName });
mongoose.connect(dbUrl);

// Error Handling for the db connection
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

// Serve favicon from public/favicon directory
app.use(favicon(path.join(__dirname, "public", "favicon", "favicon.ico")));
// Handle favicon requests explicitly
app.use("/favicon.ico", (req, res) => {
  res.sendStatus(204); // No Content
});

// Setting up the app
app.engine("ejs", ejsMate); // Tells express to use ejsmate for rendering .ejs html files
app.set("view engine", "ejs"); // Sets ejs as the default engine
app.set("views", [
  path.join(__dirname, "views"),
  path.join(sharedAuthRoot, "src", "views"),
  path.join(sharedPolicyRoot, "src", "views"),
  path.join(sharedUiRoot, "src", "views"),
]); // Forces express to look at views directory for .ejs files
app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Makes req.body available
app.use(methodOverride("_method")); // Allows us to add HTTP verbs other than post
app.use(express.static(path.join(__dirname, "/public"))); // Serves static files (css, js, images) from public directory
// Setting shared static assets
app.use(
  "/stylesheets/shared-auth",
  express.static(path.join(sharedAuthRoot, "public")),
);
app.use(
  "/javascripts/shared-auth",
  express.static(path.join(sharedAuthRoot, "public")),
);
app.use(
  "/stylesheets/shared-policy",
  express.static(path.join(sharedPolicyRoot, "public")),
);
app.use(
  "/javascripts/shared-policy",
  express.static(path.join(sharedPolicyRoot, "public")),
);
app.use(
  "/javascripts/shared-ui/javascripts",
  express.static(path.join(sharedUiRoot, "public", "javascripts")),
);
app.use(
  "/stylesheets/shared-ui/stylesheets",
  express.static(path.join(sharedUiRoot, "public", "stylesheets")),
);

// Helps to stop mongo injection by not allowing certain characters in the query string
app.use((req, res, next) => {
  if (req.body)
    req.body = mongoSanitize.sanitize(req.body, { replaceWith: "_" });
  if (req.params)
    req.params = mongoSanitize.sanitize(req.params, { replaceWith: "_" });
  next();
});

// Setting up helmet to allow certain scripts/stylesheets
app.use(helmet(createHelmetConfig()));

// Setting up session
const sessionConfig = createSessionConfig({
  name: "blog_longrunner", // Name for the session cookie
  mongoUrl: dbUrl,
  MongoStore,
});
app.use(session(sessionConfig));

// Required after session setup.
app.use(flash()); // Custom flash messages
app.use(back()); // Allows back-to-last-page links
app.use(populateUser); // Custom authentication middleware to populate user from session
app.use(compression()); // Compression to make website run quicker
app.use(generalLimiter); // Apply general rate limiting to all requests
app.use(
  boilerplateHelper({
    appRoot: __dirname,
    meta: {
      metaTitle: "MY IRONMAN BLOG - From start to finish, follow my journey.",
      metaDescription:
        "A blog about my Ironman triathlon journey. Follow me from my first day of training to the big day. I discuss nutrition, training plans, triathlon kit and ups and downs.",
      metaKeywords:
        "Ironman, Ironman Blog, training plan, triathlon, journey, nutrition, cycling, swim, run, shopping list",
      metaAuthor: "Chris Hutchinson",
    },
  }),
); // Helper for app specific meta-data and navbar/footer

// Middleware to set local variables and handle user session data
app.use(async (req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

////////////////////////////// Shared Routes //////////////////////////////
// Policy routes
app.get("/policy/cookie-policy", policy.cookiePolicy);
app.get("/policy/tandc", recaptcha.middleware.render, policy.tandc);
app.post(
  "/policy/tandc",
  recaptcha.middleware.verify,
  formSubmissionLimiter,
  validateTandC,
  policy.tandcPost,
);

// Auth routes
app.get("/auth/register", users.register);
app.post(
  "/auth/register",
  authLimiter,
  validateRegister,
  catchAsync(users.registerPost),
);
app.get("/auth/login", users.login);
app.post(
  "/auth/login",
  authLimiter,
  validateLogin,
  authenticateUser,
  catchAsync(async (req, res) => {
    await loginUser(req, req.user);
    req.flash("success", "Welcome back!");
    const redirectUrl = req.session.returnTo || "/";
    delete req.session.returnTo;
    res.redirect(redirectUrl);
  }),
);
app.get("/auth/logout", users.logout);
app.get("/auth/forgot", users.forgot);
app.post(
  "/auth/forgot",
  passwordResetLimiter,
  validateForgot,
  catchAsync(users.forgotPost),
);
app.get("/auth/reset/:token", users.reset);
app.post("/auth/reset/:token", validateReset, catchAsync(users.resetPost));
app.get("/auth/details", isLoggedIn, users.details);
app.post(
  "/auth/details",
  validateDetails,
  formSubmissionLimiter,
  catchAsync(users.detailsPost),
);
app.get("/auth/deletepre", isLoggedIn, users.deletePre);
app.delete("/auth/delete", isLoggedIn, validateDelete, users.deleteUser);

////////////////////////////// App Specific Routes //////////////////////////////
// Admin routes
app.get("/admin", isLoggedIn, isAdmin, catchAsync(admin.dashboard));
app.get(
  "/admin/flagged-reviews",
  isLoggedIn,
  isAdmin,
  catchAsync(admin.flaggedReviews),
);
app.post(
  "/admin/flagged-reviews/:reviewId/:action",
  isLoggedIn,
  isAdmin,
  catchAsync(admin.updateFlaggedReview),
);
app.get(
  "/admin/all-reviews",
  isLoggedIn,
  isAdmin,
  catchAsync(admin.allReviews),
);
app.post(
  "/admin/all-reviews/:reviewId/delete",
  isLoggedIn,
  isAdmin,
  catchAsync(admin.deleteReviewWithReason),
);
app.get("/admin/posts", isLoggedIn, isAdmin, catchAsync(admin.posts));
app.get("/admin/posts/new", isLoggedIn, isAdmin, catchAsync(admin.newPost));
app.post("/admin/posts", isLoggedIn, isAdmin, catchAsync(admin.createPost));
app.get(
  "/admin/posts/:id/edit",
  isLoggedIn,
  isAdmin,
  catchAsync(admin.editPost),
);
app.put("/admin/posts/:id", isLoggedIn, isAdmin, catchAsync(admin.updatePost));
app.delete(
  "/admin/posts/:id",
  isLoggedIn,
  isAdmin,
  catchAsync(admin.deletePost),
);

// Review routes
app.post(
  "/blogim/:id/reviews",
  formSubmissionLimiter,
  validateReview,
  catchAsync(reviews.create),
);
app.delete(
  "/blogim/:id/reviews/:reviewId",
  isReviewAuthor,
  isLoggedIn,
  catchAsync(reviews.deleteReview),
);
app.get("/blogim/:id/reviews", reviews.reviewLogin);

// BlogIM routes (public only)
app.get("/", catchAsync(blogsIM.index));
app.get("/blogim/:id", catchAsync(blogsIM.show));

////////////////////////////// Shared Util Routes //////////////////////////////
// Site-Map route
app.get("/sitemap.xml", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "manifest", "sitemap.xml"));
});

// Unknown (404) webpage error
app.use(policy.notFound);

// Error Handler
app.use(errorHandler);

// Start server on port using HTTP
const port = 3004;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port} on all interfaces`);
});
