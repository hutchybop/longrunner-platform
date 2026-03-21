// External imports
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
import helmet from "helmet";
import compression from "compression";
import favicon from "serve-favicon";
import http from "http";
import { Server } from "socket.io";

// Setting up shared assets
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

// Required for recaptcha
const { RecaptchaV2: Recaptcha } = await import("express-recaptcha");
const recaptcha = new Recaptcha(process.env.SITEKEY, process.env.SECRETKEY, {
  callback: "cb",
});

// Local imports
import {
  generalLimiter,
  formSubmissionLimiter,
} from "@longrunner/shared-utils/rateLimiter.js";
import {
  createMongoDbUrl,
  createSessionConfig,
  createHelmetConfig,
  loadAppEnv,
} from "@longrunner/shared-config";
import flash from "@longrunner/shared-utils/flash.js";
import catchAsync from "@longrunner/shared-utils/catchAsync.js";
import { errorHandler } from "@longrunner/shared-utils/errorHandler.js";
import * as quiz from "./controllers/quiz.js";
import * as api from "./controllers/api.js";
import * as policy from "./controllers/policy.js";
import { quizChecks } from "./utils/quizChecks.js";
import {
  validateLobbyNew,
  validateLobbyJoin,
  validateUserData,
  validateTandC,
} from "./utils/middleware.js";
import { boilerplateHelper } from "@longrunner/shared-ui/boilerplateHelper.js";
import { createTrackingMiddlewareStack } from "@longrunner/shared-tracker";

// Setting up the app
const app = express();

// If in production, tells express about nginx proxy
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  ...createTrackingMiddlewareStack({
    appName: "quiz",
  }),
);

// Setting up socket.io
const server = http.createServer(app);
const io = new Server(server);

// Setting Mongodb Atlas
const dbName = "quiz";
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
  path.join(sharedPolicyRoot, "src", "views"),
  path.join(sharedUiRoot, "src", "views"),
]); // Forces express to look at views directory for .ejs files
app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Makes req.body available
app.use(methodOverride("_method")); // Allows us to add HTTP verbs other than post
app.use(express.static(path.join(__dirname, "/public"))); // Serves static files (css, js, images) from public directory
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

// Setting up helmet to allow certain scripts/stylesheets
app.use(helmet(createHelmetConfig()));

// Setting up session
const sessionConfig = createSessionConfig({
  name: "quiz_longrunner", // Name for the session cookie
  mongoUrl: dbUrl,
  MongoStore,
});
app.use(session(sessionConfig));

// Required after session setup.
app.use(flash()); // Custom flash messages
app.use(compression()); // Compression to make website run quicker
app.use(generalLimiter); // Apply general rate limiting to all requests
app.use(
  boilerplateHelper({
    appRoot: __dirname,
    meta: {
      metaTitle: "Longrunner Quiz - Take a general knowledge quiz",
      metaDescription:
        "Take a general knowledge quiz on longrunner. Play on your own or with friends. Choose between 10-50 questions and select your difficulty level.",
      metaKeywords:
        "quiz, general knowledge quiz, multiplayer quiz, trivia, online quiz, quiz game",
      metaAuthor: "Chris Hutchinson",
    },
    misc: "partials/quizControl",
  }),
); // Helper for app specific meta-data and navbar/footer

// Add any middleware to run before every request here
app.use(async (req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.userData = req.session.userData || null; // Sets userData for all routes
  next();

  // // Good for debugging
  // if(res.locals.userData){
  //     console.log(res.locals.userData.userName + ' ' + req.path)
  // }else{
  //     console.log(req.path)
  // }
});

// Validate userData if present
app.use(validateUserData);
// Make sure the user is in the correct place
// app.use(catchAsync(quizChecks))
app.use(quizChecks);

// Pass `io` instance to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

////////////////////////////// Shared Routes //////////////////////////////
app.get("/policy/cookie-policy", policy.cookiePolicy);
app.get("/policy/tandc", recaptcha.middleware.render, policy.tandc);
app.post(
  "/policy/tandc",
  recaptcha.middleware.verify,
  formSubmissionLimiter,
  validateTandC,
  policy.tandcPost,
);

////////////////////////////// App Specific Routes //////////////////////////////
// Ajax-api routes
app.get("/api/quizcode", api.quizCode);
app.post("/api/start-quiz", catchAsync(api.startQuiz));
app.post("/api/submit-quiz", catchAsync(api.submitQuiz));
app.get("/api/show-quiz", api.showQuiz);
app.get("/api/next-quiz", catchAsync(api.nextQuiz));
app.get("/api/finished-quiz", catchAsync(api.finishedQuiz));
app.get("/api/logs", catchAsync(api.logs));

// Quiz routes
app.get("/", quiz.index);
app.post("/lobby-new", validateLobbyNew, catchAsync(quiz.lobbyNewPost));
app.post("/lobby-join", validateLobbyJoin, catchAsync(quiz.lobbyJoinPost));
app.get("/lobby", catchAsync(quiz.lobby));
app.get("/quiz", catchAsync(quiz.quiz));
app.get("/finish", catchAsync(quiz.finish));
app.patch("/quiz-kick-user", catchAsync(quiz.quizKickUserPatch));
app.patch("/reset-user", catchAsync(quiz.resetUserPatch));
app.delete("/reset-quiz", catchAsync(quiz.resetQuizDelete));

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
const port = 3002;
server.listen(port, "0.0.0.0", () =>
  console.log(`Server running on port ${port} on all interfaces`),
);

// // Simplified io.socket setup
// io.on("connection", (socket) => {
//   // No need to log connections and disconnections if not required
//   // const clientId = socket.id;
//   // console.log(`User connected: ${clientId}`);
//   // // Listen for disconnection
//   // socket.on('disconnect', () => {
//   //     console.log(`User disconnected: ${clientId}`);
//   // });
// });
