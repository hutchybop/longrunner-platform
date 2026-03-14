import axios from "axios";
import geoip from "geoip-lite";

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
  const {
    appName,
    trackerUrl = process.env.TRACKER_URL || "http://localhost:3004",
    apiPath = "/api/track",
    skipPaths = DEFAULT_SKIP_PATHS,
    timeoutMs = 1000,
  } = config;

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

        await axios.post(`${trackerUrl}${apiPath}`, trackerData, {
          timeout: timeoutMs,
        });
      } catch (error) {
        console.error("Failed to track request:", error.message);
      }
    });

    next();
  };
}

export function createBlockedIpMiddleware(config = {}) {
  const {
    trackerUrl = process.env.TRACKER_URL || "http://localhost:3004",
    blockedIpsPath = "/api/blocked-ips",
    cacheTtlMs = 5 * 60 * 1000,
    timeoutMs = 1000,
  } = config;

  let blockedIpCache = new Set();
  let lastCacheUpdate = 0;
  let refreshPromise = null;

  const refreshBlockedIpCache = async () => {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      const response = await axios.get(`${trackerUrl}${blockedIpsPath}`, {
        timeout: timeoutMs,
      });

      const blockedIps = Array.isArray(response.data?.blockedIps)
        ? response.data.blockedIps
        : [];

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
  const {
    appName,
    trackerUrl = process.env.TRACKER_URL || "http://localhost:3004",
    skipPaths = DEFAULT_SKIP_PATHS,
  } = config;

  return [
    createIpContextMiddleware(),
    createBlockedIpMiddleware({
      trackerUrl,
    }),
    createTrackRequestMiddleware({
      appName,
      trackerUrl,
      skipPaths,
    }),
  ];
}
