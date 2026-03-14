import mongoose from "mongoose";
import { createMongoDbUrl } from "@longrunner/shared-config";

let trackerConnection = null;
let trackerConnectionPromise = null;

const TRACKER_DB_NAME = "longrunnerTracker";

export async function getTrackerConnection() {
  if (trackerConnection?.readyState === 1) {
    return trackerConnection;
  }

  if (trackerConnectionPromise) {
    return trackerConnectionPromise;
  }

  const dbUrl = createMongoDbUrl({
    dbName: TRACKER_DB_NAME,
    appName: TRACKER_DB_NAME,
  });

  trackerConnection = mongoose.createConnection(dbUrl, {
    serverSelectionTimeoutMS: 5000,
  });

  trackerConnectionPromise = trackerConnection
    .asPromise()
    .then(() => trackerConnection)
    .catch((error) => {
      trackerConnection = null;
      throw error;
    })
    .finally(() => {
      trackerConnectionPromise = null;
    });

  return trackerConnectionPromise;
}
