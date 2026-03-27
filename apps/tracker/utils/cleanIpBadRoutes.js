import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { createMongoDbUrl, loadAppEnv } from "@longrunner/shared-config";
import "../models/tracker.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadAppEnv({ appRoot: path.resolve(__dirname, "..") });

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    ip: "",
    apply: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--apply") {
      args.apply = true;
      continue;
    }

    if (token === "--ip") {
      args.ip = (argv[index + 1] || "").trim();
      index += 1;
    }
  }

  return args;
}

function mapValues(routeMap) {
  if (!routeMap) return [];
  if (routeMap instanceof Map) {
    return [...routeMap.values()];
  }
  if (typeof routeMap === "object") {
    return Object.values(routeMap);
  }
  return [];
}

function mapKeys(routeMap) {
  if (!routeMap) return [];
  if (routeMap instanceof Map) {
    return [...routeMap.keys()];
  }
  if (typeof routeMap === "object") {
    return Object.keys(routeMap);
  }
  return [];
}

function toCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function cleanIpBadRoutes({ ip, apply = false }) {
  if (!ip) {
    throw new Error("Missing required argument --ip <ip>");
  }

  const dbUrl = createMongoDbUrl({ dbName: "longrunnerTracker" });
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(dbUrl);
  }

  const Tracker = mongoose.model("Tracker");
  const trackerDocs = await Tracker.find({ ip })
    .select({
      appName: 1,
      badRoutes: 1,
      badRouteCount: 1,
      goodRoutes: 1,
      timesVisited: 1,
    })
    .lean();

  const trackerSummary = trackerDocs.map((doc) => {
    const values = mapValues(doc.badRoutes);
    return {
      appName: doc.appName,
      uniqueBadRoutes: values.length,
      totalBadHits: values.reduce((sum, count) => sum + toCount(count), 0),
    };
  });

  const totalUniqueBadRoutes = trackerSummary.reduce(
    (sum, row) => sum + row.uniqueBadRoutes,
    0,
  );
  const totalBadHits = trackerSummary.reduce(
    (sum, row) => sum + row.totalBadHits,
    0,
  );
  const trackerevents = mongoose.connection.collection("trackerevents");
  const badEventsCount = await trackerevents.countDocuments({
    ip,
    isGoodRoute: false,
  });
  const remainingEventsByApp = await trackerevents
    .aggregate([
      { $match: { ip } },
      {
        $group: {
          _id: "$appName",
          totalVisits: { $sum: 1 },
          lastSeenAt: { $max: "$createdAt" },
        },
      },
    ])
    .toArray();
  const remainingVisitsMap = new Map(
    remainingEventsByApp
      .filter((entry) => typeof entry?._id === "string")
      .map((entry) => [entry._id, toCount(entry.totalVisits)]),
  );

  const preview = {
    ip,
    apply,
    trackerDocumentsMatched: trackerDocs.length,
    totalUniqueBadRoutes,
    totalBadHits,
    badEventsCount,
    perApp: trackerSummary,
    projectedPerAppVisits: trackerDocs.map((doc) => ({
      appName: doc.appName,
      currentTimesVisited: toCount(doc.timesVisited),
      projectedTimesVisited: remainingVisitsMap.get(doc.appName) || 0,
    })),
  };

  if (!apply) {
    return {
      ...preview,
      updatedTrackerDocuments: 0,
      deletedBadEvents: 0,
      mode: "dry-run",
    };
  }

  const deleteResult = await trackerevents.deleteMany({
    ip,
    isGoodRoute: false,
  });

  const refreshedEventsByApp = await trackerevents
    .aggregate([
      { $match: { ip } },
      {
        $group: {
          _id: "$appName",
          totalVisits: { $sum: 1 },
          lastSeenAt: { $max: "$createdAt" },
        },
      },
    ])
    .toArray();
  const refreshedVisitsMap = new Map(
    refreshedEventsByApp
      .filter((entry) => typeof entry?._id === "string")
      .map((entry) => [
        entry._id,
        {
          totalVisits: toCount(entry.totalVisits),
          lastSeenAt:
            entry.lastSeenAt instanceof Date ? entry.lastSeenAt : null,
        },
      ]),
  );

  const bulkOps = trackerDocs.map((doc) => {
    const visitInfo = refreshedVisitsMap.get(doc.appName) || {
      totalVisits: 0,
      lastSeenAt: null,
    };
    const update = {
      badRoutes: {},
      badRouteCount: 0,
      timesVisited: visitInfo.totalVisits,
      goodRouteCount: mapKeys(doc.goodRoutes).length,
    };

    if (visitInfo.lastSeenAt) {
      update.lastVisitDate = visitInfo.lastSeenAt.toLocaleDateString("en-GB");
      update.lastVisitTime = visitInfo.lastSeenAt.toLocaleTimeString("en-GB", {
        hour12: false,
      });
    }

    return {
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: update },
      },
    };
  });

  let updatedTrackerDocuments = 0;
  if (bulkOps.length > 0) {
    const bulkResult = await Tracker.bulkWrite(bulkOps);
    updatedTrackerDocuments = bulkResult.modifiedCount || 0;
  }

  return {
    ...preview,
    updatedTrackerDocuments,
    deletedBadEvents: deleteResult.deletedCount || 0,
    mode: "apply",
  };
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const args = parseArgs();

  cleanIpBadRoutes(args)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to clean IP bad routes:", error.message);
      process.exit(1);
    });
}

export { cleanIpBadRoutes };
