import mongoose from "mongoose";
import { getTrackerConnection } from "./db.js";

const trackerSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      index: true,
    },
    appName: {
      type: String,
      required: true,
      index: true,
    },
    country: {
      type: String,
      default: "UNKNOWN",
    },
    city: {
      type: String,
      default: "UNKNOWN",
    },
    timesVisited: {
      type: Number,
      default: 1,
    },
    lastVisitDate: {
      type: String,
      default: () => new Date().toLocaleDateString("en-GB"),
    },
    lastVisitTime: {
      type: String,
      default: () => new Date().toLocaleTimeString("en-GB", { hour12: false }),
    },
    goodRoutes: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    badRoutes: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    userAgent: {
      type: String,
      default: "UNKNOWN",
    },
    isFirstVisit: {
      type: Boolean,
      default: true,
    },
    lastEnvironment: {
      type: String,
      default: "development",
    },
    lastHost: {
      type: String,
      default: "UNKNOWN",
    },
    lastIsLocalDev: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

trackerSchema.index({ ip: 1, appName: 1 }, { unique: true });
trackerSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);
trackerSchema.index({ appName: 1, updatedAt: -1 });

const TRACKER_EVENT_RETENTION_DAYS =
  Number.parseInt(process.env.TRACKER_EVENT_RETENTION_DAYS || "30", 10) || 30;

const trackerEventSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      index: true,
      default: "UNKNOWN",
    },
    appName: {
      type: String,
      required: true,
      index: true,
    },
    country: {
      type: String,
      default: "UNKNOWN",
    },
    city: {
      type: String,
      default: "UNKNOWN",
    },
    userAgent: {
      type: String,
      default: "UNKNOWN",
    },
    route: {
      type: String,
      default: "UNKNOWN",
    },
    method: {
      type: String,
      default: "UNKNOWN",
    },
    statusCode: {
      type: Number,
      default: 0,
    },
    isGoodRoute: {
      type: Boolean,
      default: false,
    },
    environment: {
      type: String,
      default: "development",
    },
    host: {
      type: String,
      default: "UNKNOWN",
    },
    isLocalDev: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

trackerEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: TRACKER_EVENT_RETENTION_DAYS * 24 * 60 * 60 },
);
trackerEventSchema.index({ appName: 1, createdAt: -1 });
trackerEventSchema.index({ ip: 1, appName: 1, createdAt: -1 });

const blockedIpSchema = new mongoose.Schema({
  blockedIPArray: [{ type: String }],
});

function sanitizeRouteKey(route) {
  return String(route)
    .replaceAll("%", "%25")
    .replaceAll(".", "%2E")
    .replaceAll("$", "%24");
}

function decodeRouteKey(route) {
  return String(route)
    .replaceAll("%24", "$")
    .replaceAll("%2E", ".")
    .replaceAll("%25", "%");
}

function getModels(connection) {
  const Tracker =
    connection.models.Tracker ||
    connection.model("Tracker", trackerSchema, "trackers");

  const TrackerEvent =
    connection.models.TrackerEvent ||
    connection.model("TrackerEvent", trackerEventSchema, "trackerevents");

  const BlockedIP =
    connection.models.BlockedIP ||
    connection.model("BlockedIP", blockedIpSchema, "blockedips");

  return { Tracker, TrackerEvent, BlockedIP };
}

export async function recordRequest(trackerData = {}) {
  const connection = await getTrackerConnection();
  const { Tracker, TrackerEvent } = getModels(connection);

  const {
    appName,
    ip,
    country,
    city,
    userAgent,
    route,
    method,
    statusCode,
    isGoodRoute,
    environment,
    host,
    isLocalDev,
  } = trackerData;

  const safeIp = ip || "UNKNOWN";
  const safeCountry = country || "UNKNOWN";
  const safeCity = city || "UNKNOWN";
  const safeUserAgent = userAgent || "UNKNOWN";
  const safeRoute = route || "UNKNOWN";
  const safeMethod = method || "UNKNOWN";
  const safeStatusCode = Number.isInteger(statusCode) ? statusCode : 0;
  const safeIsGoodRoute =
    typeof isGoodRoute === "boolean" ? isGoodRoute : false;
  const safeEnvironment = environment || process.env.NODE_ENV || "development";
  const safeHost = host || "UNKNOWN";
  const safeIsLocalDev = Boolean(isLocalDev);
  const safeRouteMapKey = sanitizeRouteKey(safeRoute);

  await TrackerEvent.create({
    ip: safeIp,
    appName,
    country: safeCountry,
    city: safeCity,
    userAgent: safeUserAgent,
    route: safeRoute,
    method: safeMethod,
    statusCode: safeStatusCode,
    isGoodRoute: safeIsGoodRoute,
    environment: safeEnvironment,
    host: safeHost,
    isLocalDev: safeIsLocalDev,
  });

  let tracker = await Tracker.findOne({ ip: safeIp, appName });

  if (!tracker) {
    tracker = new Tracker({
      ip: safeIp,
      appName,
      country: safeCountry,
      city: safeCity,
      userAgent: safeUserAgent,
      timesVisited: 1,
      isFirstVisit: true,
      lastEnvironment: safeEnvironment,
      lastHost: safeHost,
      lastIsLocalDev: safeIsLocalDev,
    });
  } else {
    tracker.timesVisited += 1;
    tracker.lastVisitDate = new Date().toLocaleDateString("en-GB");
    tracker.lastVisitTime = new Date().toLocaleTimeString("en-GB", {
      hour12: false,
    });
    tracker.isFirstVisit = false;
    tracker.userAgent = safeUserAgent || tracker.userAgent;
    tracker.lastEnvironment = safeEnvironment;
    tracker.lastHost = safeHost;
    tracker.lastIsLocalDev = safeIsLocalDev;

    if (tracker.ip === "UNKNOWN" && safeIp !== "UNKNOWN") tracker.ip = safeIp;
    if (tracker.country === "UNKNOWN" && safeCountry !== "UNKNOWN") {
      tracker.country = safeCountry;
    }
    if (tracker.city === "UNKNOWN" && safeCity !== "UNKNOWN") {
      tracker.city = safeCity;
    }
  }

  const routeMap = safeIsGoodRoute ? tracker.goodRoutes : tracker.badRoutes;
  const currentRouteCount = routeMap.get(safeRouteMapKey) || 0;
  routeMap.set(safeRouteMapKey, currentRouteCount + 1);

  await tracker.save();
}

export { decodeRouteKey };

export async function getBlockedIps() {
  const connection = await getTrackerConnection();
  const { BlockedIP } = getModels(connection);
  const blockedDocs = await BlockedIP.find({}, { blockedIPArray: 1 }).lean();

  return blockedDocs
    .flatMap((doc) =>
      Array.isArray(doc.blockedIPArray) ? doc.blockedIPArray : [],
    )
    .filter((ip) => typeof ip === "string")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

export async function blockIpAddress(ip) {
  const safeIp = typeof ip === "string" ? ip.trim() : "";
  if (!safeIp) return false;

  const connection = await getTrackerConnection();
  const { BlockedIP } = getModels(connection);
  const blockedDocs = await BlockedIP.find();

  if (blockedDocs.length > 0) {
    if (!blockedDocs[0].blockedIPArray.includes(safeIp)) {
      blockedDocs[0].blockedIPArray.push(safeIp);
      blockedDocs[0].markModified("blockedIPArray");
      await blockedDocs[0].save();
    }
    return true;
  }

  await new BlockedIP({ blockedIPArray: [safeIp] }).save();
  return true;
}

export async function unblockIpAddress(ip) {
  const safeIp = typeof ip === "string" ? ip.trim() : "";
  if (!safeIp) return false;

  const connection = await getTrackerConnection();
  const { BlockedIP } = getModels(connection);
  const blockedDocs = await BlockedIP.find();

  if (blockedDocs.length === 0) {
    return false;
  }

  const index = blockedDocs[0].blockedIPArray.indexOf(safeIp);
  if (index === -1) {
    return false;
  }

  blockedDocs[0].blockedIPArray.splice(index, 1);
  blockedDocs[0].markModified("blockedIPArray");
  await blockedDocs[0].save();
  return true;
}
