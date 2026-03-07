import "dotenv/config";

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { RecaptchaV2: Recaptcha } = await import("express-recaptcha");
const recaptcha = new Recaptcha(process.env.SITEKEY, process.env.SECRETKEY, {
  callback: "cb",
});

import {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  formSubmissionLimiter,
} from "@longrunner/shared-utils/rateLimiter.js";
import { authenticateUser, loginUser } from "@longrunner/shared-auth/auth.js";
import flash from "@longrunner/shared-utils/flash.js";
import catchAsync from "@longrunner/shared-utils/catchAsync.js";
import { errorHandler } from "@longrunner/shared-utils/errorHandler.js";
import * as policy from "./controllers/policy.js";
import * as users from "./controllers/users.js";
import * as reviews from "./controllers/reviews.js";
import * as blogsIM from "./controllers/blogsIM.js";
import * as admin from "./controllers/admin.js";
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

const app = express();
app.locals.User = User;

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const dbName = "blog";
const dbUrl = [
  "mongodb+srv://hutch:",
  process.env.MONGODB,
  "@hutchybop.kpiymrr.mongodb.net/",
  dbName,
  "?retryWrites=true&w=majority&appName=hutchyBop",
].join("");
mongoose.connect(dbUrl);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

app.use(favicon(path.join(__dirname, "public", "favicon", "favicon.ico")));
app.use("/favicon.ico", (req, res) => {
  res.sendStatus(204);
});

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));

app.use((req, res, next) => {
  if (req.body)
    req.body = mongoSanitize.sanitize(req.body, { replaceWith: "_" });
  if (req.params)
    req.params = mongoSanitize.sanitize(req.params, { replaceWith: "_" });
  next();
});

const scriptSrcUrls = [
  "https://stackpath.bootstrapcdn.com/",
  "https://cdnjs.cloudflare.com/",
  "https://cdn.jsdelivr.net/",
  "https://code.jquery.com/",
  "https://www.google.com/recaptcha/api.js",
  "https://www.gstatic.com/recaptcha/releases/",
  "https://use.fontawesome.com/",
];
const styleSrcUrls = [
  "https://kit-free.fontawesome.com/",
  "https://stackpath.bootstrapcdn.com/",
  "https://fonts.googleapis.com/",
  "https://use.fontawesome.com/",
  "https://cdn.jsdelivr.net/",
  "https://cdnjs.cloudflare.com/",
  "https://fonts.gstatic.com",
  "https://www.gstatic.com/recaptcha/releases/",
];
const imgSrcUrls = [
  "https://www.gstatic.com/recaptcha/",
  "https://www.google.com/recaptcha/",
];
const connectSrcUrls = [
  "https://www.google.com/",
  "https://www.gstatic.com/recaptcha/",
];
const fontSrcUrls = [
  "https://cdnjs.cloudflare.com/",
  "https://fonts.gstatic.com",
  "https://fonts.googleapis.com/",
  "https://use.fontawesome.com/",
];
const frameSrcUrls = ["https://www.google.com", "https://www.recaptcha.net"];

function configureHelmet() {
  if (process.env.NODE_ENV === "production") {
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'self'", "'unsafe-inline'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: ["'none'"],
            imgSrc: ["'self'", "blob:", "data:", ...imgSrcUrls],
            fontSrc: ["'self'", ...fontSrcUrls],
            frameSrc: ["'self'", ...frameSrcUrls],
            upgradeInsecureRequests: null,
            scriptSrcAttr: ["'self'", "'unsafe-inline'"],
          },
        },
        crossOriginOpenerPolicy: { policy: "same-origin" },
        originAgentCluster: true,
      }),
    );
  } else {
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'", "*"],
            connectSrc: ["'self'", "*", ...connectSrcUrls],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              "'unsafe-eval'",
              "*",
              ...scriptSrcUrls,
            ],
            styleSrc: ["'self'", "'unsafe-inline'", "*", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: ["'self'", "*"],
            imgSrc: ["'self'", "blob:", "data:", "*", ...imgSrcUrls],
            fontSrc: ["'self'", "*", ...fontSrcUrls],
            frameSrc: ["'self'", "*", ...frameSrcUrls],
            upgradeInsecureRequests: null,
            scriptSrcAttr: ["'self'", "'unsafe-inline'", "*"],
          },
        },
        crossOriginOpenerPolicy: { policy: "unsafe-none" },
        originAgentCluster: false,
        referrerPolicy: { policy: "no-referrer-when-downgrade" },
        frameguard: false,
        hsts: false,
        noSniff: false,
      }),
    );
  }
}
configureHelmet();

const sessionConfig = {
  name: "blog_longrunner",
  secret: process.env.SESSION_KEY,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 * 2,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  },
  store: MongoStore.create({
    mongoUrl: dbUrl,
  }),
};
app.use(session(sessionConfig));

app.use(flash());
app.use(back());
app.use(populateUser);
app.use(compression());
app.use(generalLimiter);

app.use(async (req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

app.get("/policy/cookie-policy", policy.cookiePolicy);
app.get("/policy/tandc", recaptcha.middleware.render, policy.tandc);
app.post(
  "/policy/tandc",
  recaptcha.middleware.verify,
  formSubmissionLimiter,
  validateTandC,
  policy.tandcPost,
);

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

app.get("/", catchAsync(blogsIM.index));
app.get("/blogim/:id", catchAsync(blogsIM.show));

app.get("/sitemap.xml", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "manifest", "sitemap.xml"));
});

app.use((req, res) => {
  res.status(404).render("policy/error", {
    err: { message: "Page Not Found", statusCode: 404 },
    title: "Error - Page Not Found",
    css_page: "error",
  });
});

app.use(errorHandler);

const port = 3004;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port} on all interfaces`);
});
