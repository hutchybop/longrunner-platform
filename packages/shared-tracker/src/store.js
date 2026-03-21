import mongoose from "mongoose";
import net from "net";
import mail from "@longrunner/shared-utils/mail.js";
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
    goodRouteCount: {
      type: Number,
      default: 0,
    },
    badRouteCount: {
      type: Number,
      default: 0,
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

const TRACKER_FLAG_THRESHOLD =
  Number.parseInt(process.env.TRACKER_FLAG_THRESHOLD || "10", 10) || 10;
const TRACKER_BLOCK_30M_THRESHOLD =
  Number.parseInt(process.env.TRACKER_BLOCK_30M_THRESHOLD || "20", 10) || 20;
const TRACKER_BLOCK_24H_THRESHOLD =
  Number.parseInt(process.env.TRACKER_BLOCK_24H_THRESHOLD || "50", 10) || 50;
const TRACKER_BLOCK_30M_DURATION_MINUTES =
  Number.parseInt(process.env.TRACKER_BLOCK_30M_DURATION_MINUTES || "30", 10) ||
  30;
const TRACKER_BLOCK_24H_DURATION_HOURS =
  Number.parseInt(process.env.TRACKER_BLOCK_24H_DURATION_HOURS || "24", 10) ||
  24;
const TRACKER_BAD_ROUTE_WINDOW_HOURS =
  Number.parseInt(process.env.TRACKER_BAD_ROUTE_WINDOW_HOURS || "24", 10) || 24;
const TRACKER_AUTO_BLOCK_EMAIL_ENABLED =
  process.env.TRACKER_AUTO_BLOCK_EMAIL_ENABLED !== "false";

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

const ipBlockSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["manual", "auto"],
      default: "manual",
    },
    reason: {
      type: String,
      default: "",
    },
    blockLevel: {
      type: String,
      enum: ["manual", "temporary_30m", "temporary_24h", "permanent"],
      default: "manual",
    },
    badRouteCountAtBlock: {
      type: Number,
      default: 0,
    },
    blockedAt: {
      type: Date,
      default: () => new Date(),
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
    isPermanent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

ipBlockSchema.index({ blockedUntil: 1 });

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

  const IpBlock =
    connection.models.IpBlock ||
    connection.model("IpBlock", ipBlockSchema, "ipblocks");

  return { Tracker, TrackerEvent, IpBlock };
}

function parseWhitelistEnv(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return new Set();
  }

  const normalized = rawValue.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!normalized) {
    return new Set();
  }

  const ips = normalized
    .split(",")
    .map((ip) => ip.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);

  return new Set(ips);
}

function getIpWhitelistSet() {
  return parseWhitelistEnv(process.env.IP_WHITE_LIST);
}

function isWhitelistedIp(ip) {
  if (typeof ip !== "string") return false;
  return getIpWhitelistSet().has(ip.trim());
}

function normalizeAndValidateIp(input) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (net.isIP(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("::ffff:") && net.isIP(trimmed.slice(7))) {
    return trimmed.slice(7);
  }
  return null;
}

function getWindowStartDate() {
  const now = Date.now();
  return new Date(now - TRACKER_BAD_ROUTE_WINDOW_HOURS * 60 * 60 * 1000);
}

function buildAutoBlockPolicy(badRouteCount24h) {
  if (badRouteCount24h > TRACKER_BLOCK_24H_THRESHOLD) {
    return {
      blockLevel: "permanent",
      isPermanent: true,
      blockedUntil: null,
      rank: 3,
      reason: `Auto blocked: ${badRouteCount24h} bad routes in rolling ${TRACKER_BAD_ROUTE_WINDOW_HOURS}h window`,
    };
  }

  if (badRouteCount24h >= TRACKER_BLOCK_24H_THRESHOLD) {
    return {
      blockLevel: "temporary_24h",
      isPermanent: false,
      blockedUntil: new Date(
        Date.now() + TRACKER_BLOCK_24H_DURATION_HOURS * 60 * 60 * 1000,
      ),
      rank: 2,
      reason: `Auto blocked: ${badRouteCount24h} bad routes in rolling ${TRACKER_BAD_ROUTE_WINDOW_HOURS}h window`,
    };
  }

  if (badRouteCount24h >= TRACKER_BLOCK_30M_THRESHOLD) {
    return {
      blockLevel: "temporary_30m",
      isPermanent: false,
      blockedUntil: new Date(
        Date.now() + TRACKER_BLOCK_30M_DURATION_MINUTES * 60 * 1000,
      ),
      rank: 1,
      reason: `Auto blocked: ${badRouteCount24h} bad routes in rolling ${TRACKER_BAD_ROUTE_WINDOW_HOURS}h window`,
    };
  }

  return null;
}

function getBlockRank(blockDoc, now = new Date()) {
  if (!blockDoc) return 0;
  if (blockDoc.blockLevel === "manual") return 4;
  if (blockDoc.isPermanent || blockDoc.blockLevel === "permanent") return 3;
  if (!blockDoc.blockedUntil || blockDoc.blockedUntil <= now) return 0;
  if (blockDoc.blockLevel === "temporary_24h") return 2;
  if (blockDoc.blockLevel === "temporary_30m") return 1;
  return 0;
}

function isActiveBlock(blockDoc, now = new Date()) {
  if (!blockDoc) return false;
  if (blockDoc.blockLevel === "manual") return true;
  if (blockDoc.isPermanent || blockDoc.blockLevel === "permanent") return true;
  return Boolean(blockDoc.blockedUntil && blockDoc.blockedUntil > now);
}

function buildActiveBlockQuery(now = new Date()) {
  return {
    $or: [
      { blockLevel: "manual" },
      { blockLevel: "permanent" },
      { isPermanent: true },
      { blockedUntil: { $gt: now } },
    ],
  };
}

async function sendAutoBlockEmail({
  ip,
  badRouteCount24h,
  blockLevel,
  blockedUntil,
  reason,
}) {
  if (!TRACKER_AUTO_BLOCK_EMAIL_ENABLED) return;

  const subject = `Tracker Auto Block: ${ip} (${blockLevel})`;
  const untilText = blockedUntil
    ? blockedUntil.toISOString()
    : "indefinite / permanent";
  const text = [
    "An IP address has been auto blocked by tracker.",
    "",
    `IP: ${ip}`,
    `Block level: ${blockLevel}`,
    `Bad routes (${TRACKER_BAD_ROUTE_WINDOW_HOURS}h rolling): ${badRouteCount24h}`,
    `Blocked until: ${untilText}`,
    `Reason: ${reason}`,
    `Triggered at: ${new Date().toISOString()}`,
  ].join("\n");

  try {
    await mail(subject, text, process.env.TRACKER_AUTO_BLOCK_NOTIFY_TO);
  } catch (error) {
    console.error("Failed to send auto-block email:", error.message);
  }
}

async function countBadRoutesForIpInWindow(TrackerEvent, ip) {
  if (!ip || ip === "UNKNOWN") return 0;
  const windowStart = getWindowStartDate();
  return TrackerEvent.countDocuments({
    ip,
    isGoodRoute: false,
    createdAt: { $gte: windowStart },
  });
}

async function applyAutoBlockForIp({ IpBlock, ip, badRouteCount24h }) {
  if (!ip || ip === "UNKNOWN" || isWhitelistedIp(ip)) {
    return;
  }

  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const now = new Date();
    const policy = buildAutoBlockPolicy(badRouteCount24h);
    if (!policy) return;

    const existing = await IpBlock.findOne({ ip }).lean();
    const existingRank = getBlockRank(existing, now);

    if (existing?.blockLevel === "manual") {
      return;
    }

    if (existingRank >= policy.rank && isActiveBlock(existing, now)) {
      return;
    }

    const update = {
      source: "auto",
      reason: policy.reason,
      blockLevel: policy.blockLevel,
      badRouteCountAtBlock: badRouteCount24h,
      blockedAt: now,
      blockedUntil: policy.blockedUntil,
      isPermanent: policy.isPermanent,
    };

    if (!existing) {
      try {
        await IpBlock.create({ ip, ...update });
        await sendAutoBlockEmail({
          ip,
          badRouteCount24h,
          blockLevel: policy.blockLevel,
          blockedUntil: policy.blockedUntil,
          reason: policy.reason,
        });
        return;
      } catch (error) {
        if (error?.code === 11000) {
          continue;
        }
        throw error;
      }
    }

    const result = await IpBlock.updateOne(
      {
        _id: existing._id,
        updatedAt: existing.updatedAt,
        blockLevel: existing.blockLevel,
        isPermanent: Boolean(existing.isPermanent),
        blockedUntil: existing.blockedUntil || null,
      },
      { $set: update },
    );

    if (result.modifiedCount === 1) {
      await sendAutoBlockEmail({
        ip,
        badRouteCount24h,
        blockLevel: policy.blockLevel,
        blockedUntil: policy.blockedUntil,
        reason: policy.reason,
      });
      return;
    }
  }
}

export async function recordRequest(trackerData = {}) {
  const connection = await getTrackerConnection();
  const { Tracker, TrackerEvent, IpBlock } = getModels(connection);

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
  const isNewRoute = currentRouteCount === 0;
  routeMap.set(safeRouteMapKey, currentRouteCount + 1);

  if (isNewRoute) {
    if (safeIsGoodRoute) {
      tracker.goodRouteCount = (tracker.goodRouteCount || 0) + 1;
    } else {
      tracker.badRouteCount = (tracker.badRouteCount || 0) + 1;
    }
  }

  await tracker.save();

  if (!safeIsGoodRoute) {
    const badRouteCount24h = await countBadRoutesForIpInWindow(
      TrackerEvent,
      safeIp,
    );
    await applyAutoBlockForIp({
      IpBlock,
      ip: safeIp,
      badRouteCount24h,
    });
  }
}

export { decodeRouteKey };

export async function getBlockedIps() {
  const connection = await getTrackerConnection();
  const { IpBlock } = getModels(connection);
  const whitelist = getIpWhitelistSet();
  const now = new Date();

  const activeIpBlocks = await IpBlock.find(buildActiveBlockQuery(now))
    .select({ ip: 1 })
    .lean();

  return activeIpBlocks
    .map((doc) => (typeof doc.ip === "string" ? doc.ip.trim() : null))
    .filter((ip) => ip && !whitelist.has(ip));
}

export async function blockIpAddress(ip) {
  const safeIp = normalizeAndValidateIp(ip);
  if (!safeIp) return { ok: false, status: "invalid_ip" };
  if (isWhitelistedIp(safeIp)) return { ok: false, status: "whitelisted" };

  const connection = await getTrackerConnection();
  const { IpBlock } = getModels(connection);

  await IpBlock.findOneAndUpdate(
    { ip: safeIp },
    {
      $set: {
        source: "manual",
        reason: "Manually blocked from tracker admin",
        blockLevel: "manual",
        blockedAt: new Date(),
        blockedUntil: null,
        isPermanent: true,
      },
      $setOnInsert: {
        ip: safeIp,
      },
    },
    {
      upsert: true,
    },
  );

  return { ok: true, status: "blocked" };
}

export async function unblockIpAddress(ip) {
  const safeIp = normalizeAndValidateIp(ip);
  if (!safeIp) return { ok: false, status: "invalid_ip" };

  const connection = await getTrackerConnection();
  const { IpBlock } = getModels(connection);

  const result = await IpBlock.deleteOne({ ip: safeIp });

  if (result.deletedCount === 0) {
    return { ok: false, status: "not_found" };
  }

  return { ok: true, status: "removed" };
}

export async function getFlaggedIps() {
  const connection = await getTrackerConnection();
  const { TrackerEvent, IpBlock } = getModels(connection);
  const windowStart = getWindowStartDate();
  const whitelist = getIpWhitelistSet();
  const now = new Date();

  const flagged = await TrackerEvent.aggregate([
    {
      $match: {
        isGoodRoute: false,
        createdAt: { $gte: windowStart },
        ip: { $nin: ["UNKNOWN", ""] },
      },
    },
    {
      $group: {
        _id: "$ip",
        badRouteCount24h: { $sum: 1 },
        lastSeenAt: { $max: "$createdAt" },
      },
    },
    {
      $match: {
        badRouteCount24h: { $gt: TRACKER_FLAG_THRESHOLD },
      },
    },
    {
      $sort: {
        badRouteCount24h: -1,
        lastSeenAt: -1,
      },
    },
  ]);

  const activeBlocks = await IpBlock.find(buildActiveBlockQuery(now)).lean();
  const activeBlockMap = new Map(
    activeBlocks
      .filter((block) => typeof block.ip === "string" && block.ip.trim())
      .map((block) => [block.ip.trim(), block]),
  );

  return flagged
    .filter((item) => typeof item._id === "string" && !whitelist.has(item._id))
    .map((item) => {
      const ip = item._id.trim();
      const activeBlock = activeBlockMap.get(ip);

      return {
        ip,
        badRouteCount24h: item.badRouteCount24h,
        lastSeenAt: item.lastSeenAt,
        isBlocked: Boolean(activeBlock),
        blockLevel: activeBlock?.blockLevel || "none",
        blockedUntil: activeBlock?.blockedUntil || null,
        isPermanent: Boolean(
          activeBlock?.isPermanent || activeBlock?.blockLevel === "manual",
        ),
        source: activeBlock?.source || null,
      };
    });
}
