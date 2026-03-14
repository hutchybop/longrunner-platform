import axios from "axios";
import geoip from "geoip-lite";

const TRACKER_URL = process.env.TRACKER_URL || "http://localhost:3004";

const getIpInfoMiddleware = (req, res, next) => {
  const ip =
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  const cleanIp = ip && ip.includes("::ffff:") ? ip.replace("::ffff:", "") : ip;

  const geo = geoip.lookup(cleanIp);

  req.ipInfo = {
    ip: cleanIp,
    country: geo ? geo.country : null,
    region: geo ? geo.region : null,
    city: geo ? geo.city : null,
    timezone: geo ? geo.timezone : null,
    ll: geo ? geo.ll : null,
  };

  next();
};

const trackRequest = (appName) => {
  return async (req, res, next) => {
    try {
      const skipPaths = [
        "/favicon.ico",
        "/stylesheets/",
        "/javascripts/",
        "/images/",
        "/manifest/",
        "/.well-known/",
        "/tracker/",
      ];

      const shouldSkip = skipPaths.some((p) => req.path.startsWith(p));
      if (shouldSkip) return next();

      const userAgent = req.get("User-Agent") || "UNKNOWN";
      const ip = req.ipInfo?.ip || req.ip || "UNKNOWN";
      const country = req.ipInfo?.country || "UNKNOWN";
      const city = req.ipInfo?.city || "UNKNOWN";

      const routePath = req.route?.path || req.originalUrl;

      res.on("finish", async () => {
        try {
          const trackerData = {
            appName,
            ip,
            country,
            city,
            userAgent,
            route: routePath,
            method: req.method,
            statusCode: res.statusCode,
            isGoodRoute:
              (req.method === "GET" && res.statusCode < 400) ||
              routePath === "/",
          };

          await axios.post(`${TRACKER_URL}/api/track`, trackerData, {
            timeout: 1000,
          });
        } catch (err) {
          console.error("Failed to track request:", err.message);
        }
      });
    } catch (error) {
      console.error("Tracker middleware error:", error);
    }

    next();
  };
};

export { getIpInfoMiddleware, trackRequest };
