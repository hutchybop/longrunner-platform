import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import mongoose from "mongoose";

import { createMongoDbUrl, loadAppEnv } from "@longrunner/shared-config";
import Tracker from "../models/tracker.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");

loadAppEnv({ appRoot });

const SUSPICIOUS_ROUTE_PARTS = [
  "wp-includes",
  "wlwmanifest.xml",
  "xmlrpc.php",
  "wp-admin",
  "wp-login",
  "wordpress",
  "phpmyadmin",
  "/.env",
  "/.git",
  "cgi-bin",
  "boaform",
  "hnap1",
  "vendor/phpunit",
];

function decodeRouteKey(route) {
  return String(route)
    .replaceAll("%24", "$")
    .replaceAll("%2E", ".")
    .replaceAll("%25", "%");
}

function normalizePathname(pathname) {
  if (typeof pathname !== "string") return "/";
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

function isSuspiciousRoute(route) {
  const decoded = decodeRouteKey(route);
  const normalized = normalizePathname(decoded).toLowerCase();
  const hasRepeatedSlashes = /\/{2,}/.test(decoded);
  if (hasRepeatedSlashes) return true;

  return SUSPICIOUS_ROUTE_PARTS.some((part) => normalized.includes(part));
}

export async function reclassifySuspiciousRoutes() {
  const dbName = "longrunnerTracker";
  const dbUrl = createMongoDbUrl({ dbName });

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(dbUrl);
  }

  let documentsScanned = 0;
  let documentsUpdated = 0;
  let movedRouteKeys = 0;
  let movedRequestCount = 0;

  const cursor = Tracker.find({}, { goodRoutes: 1, badRoutes: 1 }).cursor();

  for await (const tracker of cursor) {
    documentsScanned += 1;

    const goodRoutes =
      tracker.goodRoutes instanceof Map
        ? tracker.goodRoutes
        : new Map(Object.entries(tracker.goodRoutes || {}));
    const badRoutes =
      tracker.badRoutes instanceof Map
        ? tracker.badRoutes
        : new Map(Object.entries(tracker.badRoutes || {}));

    let documentChanged = false;

    for (const [routeKey, count] of goodRoutes.entries()) {
      if (!isSuspiciousRoute(routeKey)) {
        continue;
      }

      const numericCount = Number.isFinite(count) ? count : Number(count) || 0;
      const existingBadCount = badRoutes.get(routeKey) || 0;

      badRoutes.set(routeKey, existingBadCount + numericCount);
      goodRoutes.delete(routeKey);

      movedRouteKeys += 1;
      movedRequestCount += numericCount;
      documentChanged = true;
    }

    if (!documentChanged) {
      continue;
    }

    tracker.goodRoutes = goodRoutes;
    tracker.badRoutes = badRoutes;
    tracker.goodRouteCount = goodRoutes.size;
    tracker.badRouteCount = badRoutes.size;

    await tracker.save();
    documentsUpdated += 1;
  }

  return {
    documentsScanned,
    documentsUpdated,
    movedRouteKeys,
    movedRequestCount,
  };
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  reclassifySuspiciousRoutes()
    .then((result) => {
      console.log("Reclassification complete", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Reclassification failed:", error);
      process.exit(1);
    });
}
