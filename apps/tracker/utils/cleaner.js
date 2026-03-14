// Standalone util to clean tracker db records
// Not used anywhere else
// run with: node apps/tracker/utils/cleaner.js

import mongoose from "mongoose";
import { pathToFileURL } from "url";
import { createMongoDbUrl } from "@longrunner/shared-config";
import "../models/tracker.js";

const cleanupOldRecords = async () => {
  try {
    const dbName = "longrunnerTracker";
    const dbUrl = createMongoDbUrl({ dbName });

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(dbUrl);
    }

    const Tracker = mongoose.model("Tracker");
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await Tracker.deleteMany({
      createdAt: { $lt: ninetyDaysAgo },
    });

    console.log(
      `Cleanup: Deleted ${result.deletedCount} records older than 90 days`,
    );
    return result.deletedCount;
  } catch (error) {
    console.error("Cleanup error:", error);
    throw error;
  }
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  cleanupOldRecords()
    .then(() => {
      console.log("Cleanup complete");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Cleanup failed:", err);
      process.exit(1);
    });
}

export { cleanupOldRecords };
