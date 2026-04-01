// External Imports
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { mongoose } from "mongoose";
import mongoSanitize from "express-mongo-sanitize";
import ejsMate from "ejs-mate";
import methodOverride from "method-override";
import back from "express-back";
import compression from "compression";
import favicon from "serve-favicon";
import session from "express-session";
import { MongoStore } from "connect-mongo";

// Setting up shared assets
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadAppEnv({ appRoot: __dirname });
const require = createRequire(import.meta.url);
const sharedUiRoot = path.resolve(
  path.dirname(require.resolve("@longrunner/shared-ui")),
  "..",
);
const sharedPolicyRoot = path.resolve(
  path.dirname(require.resolve("@longrunner/shared-policy")),
  "..",
);

// Local imports
import {
  createMongoDbUrl,
  createSessionConfig,
  loadAppEnv,
} from "@longrunner/shared-config";
import { sendWeeklySummaryEmailIfDue } from "@longrunner/shared-tracker";
import flash from "@longrunner/shared-utils/flash.js";
import catchAsync from "@longrunner/shared-utils/catchAsync.js";
import { errorHandler } from "@longrunner/shared-utils/errorHandler.js";
import * as policy from "./controllers/policy.js";
import * as admin from "./controllers/admin.js";
import { boilerplateHelper } from "@longrunner/shared-ui/boilerplateHelper.js";

// Setting up the app
const app = express();

// If in production, tells express about nginx proxy
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Setting Mongodb Atlas
const dbName = "longrunnerTracker";
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

// Setting up the app
app.engine("ejs", ejsMate); // Tells express to use ejsmate for rendering .ejs html files
app.set("view engine", "ejs"); // Sets ejs as the default engine
app.set("views", [
  path.join(__dirname, "views"),
  path.join(sharedUiRoot, "src", "views"),
  path.join(sharedPolicyRoot, "src", "views"),
]); // Forces express to look at views directory for .ejs files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Makes req.body available
app.use(methodOverride("_method")); // Allows us to add HTTP verbs other than post
// Setting shared static assets
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

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// Setting up session
const sessionConfig = createSessionConfig({
  name: "tracker_longrunner",
  mongoUrl: dbUrl,
  MongoStore,
});
app.use(session(sessionConfig));

// App middleware
app.use(flash());
app.use(back()); // Allows back-to-last-page links
app.use(compression()); // Compression to make website run quicker
app.use(
  boilerplateHelper({
    appRoot: __dirname,
    showCookieAlert: false,
    meta: {
      metaTitle: "longrunner Tracker",
      metaDescription: "longrunner Tracker",
      metaKeywords: "tracker",
      metaAuthor: "Chris Hutchinson",
    },
  }),
); // Helper for app specific meta-data and navbar/footer

////////////////////////////// App Specific Routes //////////////////////////////
// Admin routes
app.get("/", (req, res) => {
  res.redirect("/admin");
});
app.get("/admin", catchAsync(admin.dashboard));
app.get("/admin/tracker", catchAsync(admin.tracker));
app.get("/admin/flagged-ips", catchAsync(admin.flaggedIPs));
app.get("/admin/blocked-ips", catchAsync(admin.blockedIPs));
app.get("/admin/summary", catchAsync(admin.summary));
app.post("/admin/block-ip", catchAsync(admin.blockIP));
app.post("/admin/unblock-ip", catchAsync(admin.unblockIP));

////////////////////////////// Shared Util Routes //////////////////////////////
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "longrunner-tracker" });
});

// Site-Map route
app.get("/sitemap.xml", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "manifest", "sitemap.xml"));
});

// Unknown (404) webpage error
app.use(policy.notFound);

// Error Handler
app.use(errorHandler);

const WEEKLY_SUMMARY_EMAIL_CHECK_INTERVAL_MS = 60 * 1000;

async function runWeeklySummaryEmailCheck() {
  try {
    const result = await sendWeeklySummaryEmailIfDue();

    if (result?.status === "sent") {
      console.log(
        `Weekly tracker summary email sent for week ${result.weekKey} (${result.timeZone} at ${result.scheduleTime})`,
      );
    }
  } catch (error) {
    console.error("Weekly tracker summary email check failed:", error);
  }
}

runWeeklySummaryEmailCheck();
globalThis.setInterval(
  runWeeklySummaryEmailCheck,
  WEEKLY_SUMMARY_EMAIL_CHECK_INTERVAL_MS,
);

// Start server on port using HTTP
const port = 3004;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port} on all interfaces`);
});
