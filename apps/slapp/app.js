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
import * as meals from "./controllers/meals.js";
import * as ingredients from "./controllers/ingredients.js";
import * as shoppingLists from "./controllers/shoppingLists.js";
import * as categories from "./controllers/categories.js";
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
  validateMeal,
  validateIngredient,
  validatedefault,
  validateshoppingListMeals,
  validateshoppingListIngredients,
  validateCategory,
  isAuthorMeal,
  isAuthorIngredient,
  isAuthorShoppingList,
} from "./utils/middleware.js";

const app = express();
app.locals.User = User;
const policy = createPolicyController({
  domain: "slapp.longrunner.co.uk",
  tandcTitle: "slapp.longrunner.co.uk Information Page",
  policyContent: {
    aboutWebsite:
      "slapp.longrunner.co.uk is a personal meal and recipe management application where users can manage their meals, recipes, ingredients, and shopping lists. The website offers a personalized experience by storing and displaying your information, such as account details, meal plans, and related data.",
    contentDisclaimerPrimary:
      "When you create an account on slapp.longrunner.co.uk, we may provide you with recipes as part of our service. Please note that these recipes are provided for your convenience and personal use. We make no warranties or representations regarding the quality, edibility, or suitability of the recipes or food prepared from them.",
    contentDisclaimerSecondary:
      "You are solely responsible for ensuring that any food prepared from the recipes is safe and suitable for consumption. We do not accept any liability for any issues or concerns arising from the use of these recipes, including but not limited to health or safety concerns.",
    intellectualProperty:
      "The content, design, and code of slapp.longrunner.co.uk are owned by the website creator. You may not reproduce, distribute, or use any part of the website or its content without prior written consent.",
    limitationOfLiability:
      'slapp.longrunner.co.uk is provided on an "as is" basis. We make no warranties or representations, express or implied, regarding the website\'s availability, functionality, or accuracy of content. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the website. Additionally, the website may be taken down or modified at any time without prior notice, and you should not rely on its continued availability.',
    cookieName: "slapp",
    cookiePurpose:
      "This cookie keeps the user logged in and loads their personal information, including meals, recipes, ingredients, shopping lists, and account details. It ensures a seamless user experience by maintaining your session across different pages.",
  },
});

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const dbName = "slapp";
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
  name: "slapp",
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

app.get("/meals", isLoggedIn, catchAsync(meals.index));
app.get("/meals/new", isLoggedIn, catchAsync(meals.newMeal));
app.post("/meals", isLoggedIn, validateMeal, catchAsync(meals.create));
app.get("/meals/:id", isLoggedIn, isAuthorMeal, catchAsync(meals.show));
app.get("/meals/:id/edit", isLoggedIn, isAuthorMeal, catchAsync(meals.edit));
app.put(
  "/meals/:id",
  isLoggedIn,
  validateMeal,
  isAuthorMeal,
  catchAsync(meals.update),
);
app.delete(
  "/meals/:id",
  isLoggedIn,
  isAuthorMeal,
  catchAsync(meals.deleteMeal),
);

app.get("/ingredients", isLoggedIn, catchAsync(ingredients.index));
app.get(
  "/ingredients/:id/edit",
  isLoggedIn,
  isAuthorIngredient,
  catchAsync(ingredients.edit),
);
app.put(
  "/ingredients/:id",
  isLoggedIn,
  validateIngredient,
  isAuthorIngredient,
  catchAsync(ingredients.update),
);
app.delete(
  "/ingredients/:id",
  isLoggedIn,
  isAuthorIngredient,
  catchAsync(ingredients.deleteIngredient),
);

app.get("/", catchAsync(shoppingLists.landing));
app.get("/shoppinglist", isLoggedIn, catchAsync(shoppingLists.index));
app.get("/shoppinglist/new", isLoggedIn, catchAsync(shoppingLists.newMeals));
app.get(
  "/shoppinglist/default",
  isLoggedIn,
  catchAsync(shoppingLists.defaultGet),
);
app.patch(
  "/shoppinglist/default",
  isLoggedIn,
  validatedefault,
  catchAsync(shoppingLists.defaultPatch),
);
app.post(
  "/shoppinglist",
  isLoggedIn,
  validateshoppingListMeals,
  catchAsync(shoppingLists.createMeals),
);
app.get(
  "/shoppinglist/edit/:id",
  isLoggedIn,
  isAuthorShoppingList,
  catchAsync(shoppingLists.edit),
);
app.put(
  "/shoppinglist/:id",
  isLoggedIn,
  validateshoppingListIngredients,
  isAuthorShoppingList,
  catchAsync(shoppingLists.createIngredients),
);
app.get(
  "/shoppinglist/:id",
  isLoggedIn,
  isAuthorShoppingList,
  catchAsync(shoppingLists.show),
);
app.delete(
  "/shoppinglist/:id",
  isLoggedIn,
  isAuthorShoppingList,
  catchAsync(shoppingLists.deleteShoppingList),
);

app.get(
  "/category/customise",
  isLoggedIn,
  catchAsync(categories.indexCustomise),
);
app.post(
  "/category/customise",
  isLoggedIn,
  validateCategory,
  catchAsync(categories.updateCustomise),
);

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

const port = 3001;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port} on all interfaces`);
});
