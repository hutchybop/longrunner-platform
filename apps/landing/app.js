import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

import ejsMate from "ejs-mate";
import session from "express-session";
import { mongoose } from "mongoose";
import { MongoStore } from "connect-mongo";
import back from "express-back";
import helmet from "helmet";
import compression from "compression";
import favicon from "serve-favicon";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadAppEnv({ appRoot: __dirname });
const require = createRequire(import.meta.url);
const sharedPolicyRoot = path.resolve(
  path.dirname(require.resolve("@longrunner/shared-policy")),
  "..",
);
const sharedUiRoot = path.resolve(
  path.dirname(require.resolve("@longrunner/shared-ui")),
  "..",
);

const { RecaptchaV2: Recaptcha } = await import("express-recaptcha");
const recaptcha = new Recaptcha(process.env.SITEKEY, process.env.SECRETKEY, {
  callback: "cb",
});

import {
  generalLimiter,
  formSubmissionLimiter,
} from "@longrunner/shared-utils/rateLimiter.js";
import {
  createHelmetConfig,
  createMongoDbUrl,
  createSessionConfig,
  loadAppEnv,
} from "@longrunner/shared-config";
import flash from "@longrunner/shared-utils/flash.js";
import { errorHandler } from "@longrunner/shared-utils/errorHandler.js";
import * as policy from "./controllers/policy.js";
import * as longrunner from "./controllers/longrunner.js";
import { validateTandC } from "./utils/middleware.js";
import { boilerplateHelper } from "@longrunner/shared-ui/boilerplateHelper.js";
import { createTrackingMiddlewareStack } from "@longrunner/shared-tracker";

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  ...createTrackingMiddlewareStack({
    appName: "landing",
  }),
);

app.use(favicon(path.join(__dirname, "public", "favicon", "favicon.ico")));

// Setting up the app
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "views"),
  path.join(sharedPolicyRoot, "src", "views"),
  path.join(sharedUiRoot, "src", "views"),
]);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/public")));
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

app.use(helmet(createHelmetConfig()));

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

// Setting up the session
const sessionConfig = createSessionConfig({
  name: "landing_longrunner",
  mongoUrl: dbUrl,
  MongoStore,
});
app.use(session(sessionConfig));

app.use(flash());
app.use(back());
app.use(compression());
app.use(generalLimiter);
app.use(
  boilerplateHelper({
    appRoot: __dirname,
    meta: {
      metaTitle: "longrunner.co.uk landing page",
      metaDescription:
        "longrunner.co.uk is a landing page that links to the longrunner app ecosystem, including the shopping list app, quiz app, and blog app",
      metaKeywords: "Landing, Navigation, slapp, quiz, blog",
      metaAuthor: "Chris Hutchinson",
    },
  }),
);

app.get("/policy/cookie-policy", policy.cookiePolicy);
app.get("/policy/tandc", recaptcha.middleware.render, policy.tandc);
app.post(
  "/policy/tandc",
  recaptcha.middleware.verify,
  formSubmissionLimiter,
  validateTandC,
  policy.tandcPost,
);

// longrunner routes
app.get("/", longrunner.landing);
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "longrunner-landing" });
});
app.get("/sitemap.xml", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "manifest", "sitemap.xml"));
});

app.use(policy.notFound);

app.use(errorHandler);

// Start server on port using HTTP
const port = 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port} on all interfaces`);
});
