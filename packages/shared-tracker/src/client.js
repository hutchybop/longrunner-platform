import geoip from "geoip-lite";
import { getBlockedIps, recordRequest } from "./store.js";

export const DEFAULT_SKIP_PATHS = [
  "/favicon.ico",
  "/stylesheets/",
  "/javascripts/",
  "/images/",
  "/manifest/",
  "/.well-known/",
  "/tracker/",
];

export function normalizeIp(req) {
  const forwardedFor = req?.headers?.["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]
      : null;

  const rawIp =
    forwardedIp?.trim() ||
    req?.ip ||
    req?.connection?.remoteAddress ||
    req?.socket?.remoteAddress ||
    req?.connection?.socket?.remoteAddress ||
    null;

  if (!rawIp) return "UNKNOWN";

  if (rawIp.includes("::ffff:")) {
    return rawIp.replace("::ffff:", "");
  }

  return rawIp;
}

export function classifyRoute({ method, statusCode, route }) {
  return (method === "GET" && statusCode < 400) || route === "/";
}

export function createIpContextMiddleware() {
  return (req, res, next) => {
    const ip = normalizeIp(req);
    const geo = ip !== "UNKNOWN" ? geoip.lookup(ip) : null;

    req.ipInfo = {
      ip,
      country: geo?.country || "UNKNOWN",
      region: geo?.region || "UNKNOWN",
      city: geo?.city || "UNKNOWN",
      timezone: geo?.timezone || "UNKNOWN",
      ll: geo?.ll || null,
    };

    next();
  };
}

export function createTrackRequestMiddleware(config = {}) {
  const { appName, skipPaths = DEFAULT_SKIP_PATHS } = config;

  if (!appName) {
    throw new Error("createTrackRequestMiddleware requires appName");
  }

  return (req, res, next) => {
    const shouldSkip = skipPaths.some((pathPrefix) =>
      req.path.startsWith(pathPrefix),
    );

    if (shouldSkip) {
      return next();
    }

    const route = req.route?.path || req.originalUrl || req.path;

    res.on("finish", async () => {
      try {
        const trackerData = {
          appName,
          ip: req.ipInfo?.ip || normalizeIp(req),
          country: req.ipInfo?.country || "UNKNOWN",
          city: req.ipInfo?.city || "UNKNOWN",
          userAgent: req.get("User-Agent") || "UNKNOWN",
          route,
          method: req.method,
          statusCode: res.statusCode,
          isGoodRoute: classifyRoute({
            method: req.method,
            statusCode: res.statusCode,
            route,
          }),
        };

        await recordRequest(trackerData);
      } catch (error) {
        console.error("Failed to track request:", error.message);
      }
    });

    next();
  };
}

export function createBlockedIpMiddleware(config = {}) {
  const { cacheTtlMs = 5 * 60 * 1000 } = config;

  let blockedIpCache = new Set();
  let lastCacheUpdate = 0;
  let refreshPromise = null;

  const refreshBlockedIpCache = async () => {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      const blockedIps = await getBlockedIps();

      blockedIpCache = new Set(
        blockedIps
          .filter((ip) => typeof ip === "string")
          .map((ip) => ip.trim())
          .filter(Boolean),
      );
      lastCacheUpdate = Date.now();
    })();

    try {
      await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  };

  return async (req, res, next) => {
    try {
      if (Date.now() - lastCacheUpdate > cacheTtlMs) {
        await refreshBlockedIpCache();
      }

      const ip = req.ipInfo?.ip || normalizeIp(req);
      if (ip !== "UNKNOWN" && blockedIpCache.has(ip)) {
        return res.status(403).json({
          error: "Access Denied",
          message:
            "Your IP address has been blocked due to suspicious activity.",
        });
      }
    } catch (error) {
      console.error("Blocked IP middleware failed:", error.message);
    }

    next();
  };
}

export function createTrackingMiddlewareStack(config = {}) {
  const { appName, skipPaths = DEFAULT_SKIP_PATHS } = config;

  return [
    createIpContextMiddleware(),
    createBlockedIpMiddleware({
      cacheTtlMs: config.cacheTtlMs,
    }),
    createTrackRequestMiddleware({
      appName,
      skipPaths,
    }),
  ];
}
