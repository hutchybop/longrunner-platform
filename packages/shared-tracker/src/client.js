import geoip from "geoip-lite";
import { getBlockedIps, recordRequest } from "./store.js";

export const DEFAULT_SKIP_PATHS = [
  "/favicon.ico",
  "/favicon/",
  "/favicon-",
  "/apple-touch-icon",
  "/browserconfig.xml",
  "/robots.txt",
  "/sitemap.xml",
  "/stylesheets/",
  "/javascripts/",
  "/images/",
  "/manifest/",
  "/.well-known/",
  "/tracker/",
];

function normalizePathname(pathname) {
  if (typeof pathname !== "string") {
    return "/";
  }

  const withoutQuery = pathname.split("?")[0] || "/";
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  const collapsedSlashes = withLeadingSlash.replace(/\/{2,}/g, "/");

  if (collapsedSlashes.length > 1 && collapsedSlashes.endsWith("/")) {
    return collapsedSlashes.slice(0, -1);
  }

  return collapsedSlashes || "/";
}

function normalizeSkipPaths(skipPaths = []) {
  return skipPaths
    .filter((pathPrefix) => typeof pathPrefix === "string" && pathPrefix.trim())
    .map((pathPrefix) => {
      const normalized = normalizePathname(pathPrefix.trim());
      return pathPrefix.endsWith("/") && !normalized.endsWith("/")
        ? `${normalized}/`
        : normalized;
    });
}

function getMatchedRouteTemplate(req) {
  const routePath = req?.route?.path;
  if (typeof routePath !== "string") {
    return null;
  }

  const baseUrl = typeof req?.baseUrl === "string" ? req.baseUrl : "";
  const combinedPath =
    routePath === "/"
      ? baseUrl || "/"
      : `${baseUrl}${routePath.startsWith("/") ? routePath : `/${routePath}`}`;

  return normalizePathname(combinedPath);
}

export function normalizeIp(req) {
  const rawIp =
    req?.ip ||
    req?.socket?.remoteAddress ||
    req?.connection?.remoteAddress ||
    req?.connection?.socket?.remoteAddress ||
    null;

  if (typeof rawIp !== "string") {
    return "UNKNOWN";
  }

  const normalized = rawIp.trim();
  if (!normalized) {
    return "UNKNOWN";
  }

  if (normalized.startsWith("::ffff:")) {
    return normalized.slice(7);
  }

  return normalized;
}

export function classifyRoute({ statusCode, route }) {
  const normalizedStatus = Number.isInteger(statusCode) ? statusCode : 0;
  if (normalizedStatus >= 500) {
    return false;
  }

  return typeof route === "string" && route.length > 0;
}

export function createIpContextMiddleware() {
  return (req, res, next) => {
    const ip = normalizeIp(req);
    const geo = ip !== "UNKNOWN" ? geoip.lookup(ip) : null;

    req.ipInfo = {
      ip,
      country: geo?.country || "UNKNOWN",
      region: geo?.region || "UNKNOWN",
      city: "UNKNOWN",
      timezone: geo?.timezone || "UNKNOWN",
      ll: geo?.ll || null,
    };

    next();
  };
}

export function createTrackRequestMiddleware(config = {}) {
  const { appName, skipPaths = DEFAULT_SKIP_PATHS } = config;
  const normalizedSkipPaths = normalizeSkipPaths(skipPaths);
  let lastTrackErrorLogAt = 0;

  if (!appName) {
    throw new Error("createTrackRequestMiddleware requires appName");
  }

  return (req, res, next) => {
    const normalizedPath = normalizePathname(
      req.originalUrl || req.path || req.url || "/",
    );
    const shouldSkip = normalizedSkipPaths.some((pathPrefix) =>
      normalizedPath.startsWith(pathPrefix),
    );

    if (shouldSkip) {
      return next();
    }

    res.on("finish", async () => {
      try {
        const matchedRouteTemplate = getMatchedRouteTemplate(req);
        const trackedRoute = matchedRouteTemplate || normalizedPath;
        const trackerData = {
          appName,
          ip: req.ipInfo?.ip || normalizeIp(req),
          country: req.ipInfo?.country || "UNKNOWN",
          city: req.ipInfo?.city || "UNKNOWN",
          userAgent: req.get("User-Agent") || "UNKNOWN",
          route: trackedRoute,
          method: req.method,
          statusCode: res.statusCode,
          isGoodRoute: classifyRoute({
            statusCode: res.statusCode,
            route: matchedRouteTemplate,
          }),
          environment: process.env.NODE_ENV || "development",
          host: req.get("Host") || "UNKNOWN",
          isLocalDev:
            process.env.NODE_ENV !== "production" ||
            /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(
              req.get("Host") || "",
            ),
        };

        await recordRequest(trackerData);
      } catch (error) {
        const now = Date.now();
        if (now - lastTrackErrorLogAt > 60 * 1000) {
          console.error("Failed to track request:", error.message);
          lastTrackErrorLogAt = now;
        }
      }
    });

    next();
  };
}

export function createBlockedIpMiddleware(config = {}) {
  const envTtlMs = Number.parseInt(
    process.env.TRACKER_BLOCKED_IP_CACHE_TTL_MS,
    10,
  );
  const defaultTtl = Number.isFinite(envTtlMs) ? envTtlMs : 10 * 1000;
  const { cacheTtlMs = defaultTtl } = config;

  let blockedIpCache = new Set();
  let lastCacheUpdate = 0;
  let lastRefreshAttempt = 0;
  let refreshPromise = null;
  let lastBlockedErrorLogAt = 0;

  const refreshBlockedIpCache = async () => {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      lastRefreshAttempt = Date.now();
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
      const now = Date.now();
      if (
        now - lastCacheUpdate > cacheTtlMs &&
        now - lastRefreshAttempt > cacheTtlMs
      ) {
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
      const now = Date.now();
      if (now - lastBlockedErrorLogAt > 60 * 1000) {
        console.error("Blocked IP middleware failed:", error.message);
        lastBlockedErrorLogAt = now;
      }
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
