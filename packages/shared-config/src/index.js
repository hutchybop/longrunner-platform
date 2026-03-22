import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createAppEslintConfig } from "./eslint.js";

export function loadAppEnv(config = {}) {
  const { appRoot, sharedEnvFile = ".env.shared" } = config;

  if (!appRoot) {
    throw new Error("loadAppEnv requires appRoot");
  }

  const repoRoot = path.resolve(appRoot, "../..");
  const sharedPath = path.join(repoRoot, sharedEnvFile);

  const readEnv = (filePath) => {
    if (!fs.existsSync(filePath)) {
      return {};
    }

    return dotenv.parse(fs.readFileSync(filePath));
  };

  for (const [key, value] of Object.entries(readEnv(sharedPath))) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function createMongoDbUrl(config = {}) {
  const {
    username = "hutch",
    password = process.env.MONGODB,
    cluster = "hutchybop.kpiymrr.mongodb.net",
    dbName,
    appName = "hutchyBop",
  } = config;

  if (!dbName) {
    throw new Error("createMongoDbUrl requires dbName");
  }

  if (!password) {
    throw new Error(
      "createMongoDbUrl requires password (set MONGODB or pass password in config)",
    );
  }

  return [
    `mongodb+srv://${username}:`,
    password,
    `@${cluster}/`,
    dbName,
    `?retryWrites=true&w=majority&appName=${appName}`,
  ].join("");
}

export function createSessionConfig(config = {}) {
  const {
    name,
    secret = process.env.SESSION_KEY,
    mongoUrl,
    isProduction = process.env.NODE_ENV === "production",
    maxAge = 1000 * 60 * 60 * 24 * 7 * 2,
    sameSite = "strict",
    MongoStore,
  } = config;

  if (!name) {
    throw new Error("createSessionConfig requires cookie name");
  }

  if (!mongoUrl) {
    throw new Error("createSessionConfig requires mongoUrl");
  }

  if (!MongoStore || typeof MongoStore.create !== "function") {
    throw new Error(
      "createSessionConfig requires MongoStore with create() method",
    );
  }

  return {
    name,
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge,
      httpOnly: true,
      sameSite,
      secure: isProduction,
    },
    store: MongoStore.create({
      mongoUrl,
      autoRemove: "native",
    }),
  };
}

export function createCspSources() {
  return {
    scriptSrcUrls: [
      "https://stackpath.bootstrapcdn.com/",
      "https://cdnjs.cloudflare.com/",
      "https://cdn.jsdelivr.net/",
      "https://code.jquery.com/",
      "https://www.google.com/recaptcha/api.js",
      "https://www.gstatic.com/recaptcha/releases/",
      "https://use.fontawesome.com/",
    ],
    styleSrcUrls: [
      "https://kit-free.fontawesome.com/",
      "https://stackpath.bootstrapcdn.com/",
      "https://fonts.googleapis.com/",
      "https://use.fontawesome.com/",
      "https://cdn.jsdelivr.net/",
      "https://cdnjs.cloudflare.com/",
      "https://fonts.gstatic.com",
      "https://www.gstatic.com/recaptcha/releases/",
    ],
    imgSrcUrls: [
      "https://www.gstatic.com/recaptcha/",
      "https://www.google.com/recaptcha/",
    ],
    connectSrcUrls: [
      "https://www.google.com/",
      "https://www.gstatic.com/recaptcha/",
    ],
    fontSrcUrls: [
      "https://cdnjs.cloudflare.com/",
      "https://fonts.gstatic.com",
      "https://fonts.googleapis.com/",
      "https://use.fontawesome.com/",
    ],
    frameSrcUrls: ["https://www.google.com", "https://www.recaptcha.net"],
  };
}

export function createHelmetConfig(config = {}) {
  const {
    isProduction = process.env.NODE_ENV === "production",
    scriptSrcUrls,
    styleSrcUrls,
    imgSrcUrls,
    connectSrcUrls,
    fontSrcUrls,
    frameSrcUrls,
  } = {
    ...createCspSources(),
    ...config,
  };

  if (isProduction) {
    return {
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
    };
  }

  return {
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
  };
}

export default {
  loadAppEnv,
  createMongoDbUrl,
  createSessionConfig,
  createCspSources,
  createHelmetConfig,
  createAppEslintConfig,
};

export { createAppEslintConfig };
