import "dotenv/config";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
import {
  createMongoDbUrl,
  createSessionConfig,
  createHelmetConfig,
} from "@longrunner/shared-config";
import { createPolicyController } from "@longrunner/shared-policy";
import { authenticateUser, loginUser } from "@longrunner/shared-auth/auth.js";
import flash from "@longrunner/shared-utils/flash.js";
import catchAsync from "@longrunner/shared-utils/catchAsync.js";
import { errorHandler } from "@longrunner/shared-utils/errorHandler.js";
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
const policy = createPolicyController({
  domain: "blog.longrunner.co.uk",
  tandcTitle: "blog.longrunner.co.uk Information Page",
  policyContent: {
    aboutWebsite:
      "blog.longrunner.co.uk is a personal Ironman training blog where users can read about training experiences, view posts about triathlon journeys, and leave reviews on blog posts. The website offers a platform to share training insights, race reports, and personal achievements in the world of Ironman and triathlon competitions.",
    appropriateUse:
      "Use the website responsibly and respect other users. You agree not to engage in any behavior that disrupts the experience for others or compromises the security and integrity of the website. When leaving reviews, ensure they are constructive, relevant, and respectful.",
    contentDisclaimerPrimary:
      "The blog posts on blog.longrunner.co.uk represent personal experiences, training methods, and opinions related to Ironman and triathlon training. The content is provided for informational and entertainment purposes only. We make no warranties or representations regarding the accuracy, completeness, or suitability of the training advice, race reports, or other content shared on this platform.",
    contentDisclaimerSecondary:
      "You are solely responsible for determining the appropriateness of any training advice or information shared on this blog for your personal situation. We recommend consulting with qualified coaches or medical professionals before undertaking any new training regimen. We do not accept any liability for any injuries, health issues, or other concerns arising from the use of information shared on this blog.",
    intellectualProperty:
      "The content, design, and code of blog.longrunner.co.uk are owned by the website creator. You may not reproduce, distribute, or use any part of the website or its content without prior written consent. This includes blog posts, training reports, photographs, and other original content shared on this platform.",
    limitationOfLiability:
      'blog.longrunner.co.uk is provided on an "as is" basis. We make no warranties or representations, express or implied, regarding the website\'s availability, functionality, or accuracy of content. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the website, including any injuries or health issues resulting from following training advice shared on this blog. Additionally, the website may be taken down or modified at any time without prior notice, and you should not rely on its continued availability.',
    cookieName: "blog_longrunner",
    cookiePurpose:
      "This cookie keeps the user logged in and maintains their session across different pages. It stores your authentication information to provide a seamless browsing experience when reading blog posts and leaving reviews.",
  },
});

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const dbName = "blog";
const dbUrl = createMongoDbUrl({ dbName });
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
app.set("views", [
  path.join(__dirname, "views"),
  path.join(sharedAuthRoot, "src", "views"),
  path.join(sharedPolicyRoot, "src", "views"),
]);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));
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

app.use((req, res, next) => {
  if (req.body)
    req.body = mongoSanitize.sanitize(req.body, { replaceWith: "_" });
  if (req.params)
    req.params = mongoSanitize.sanitize(req.params, { replaceWith: "_" });
  next();
});

app.use(helmet(createHelmetConfig()));

const sessionConfig = createSessionConfig({
  name: "blog_longrunner",
  mongoUrl: dbUrl,
  MongoStore,
});
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
