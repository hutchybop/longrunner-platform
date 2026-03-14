import mongoose from "mongoose";
import { createMongoDbUrl } from "@longrunner/shared-config";

let trackerConnection = null;
let trackerConnectionPromise = null;

const TRACKER_DB_NAME = "longrunnerTracker";
let trackerDbConfigError = null;

export async function getTrackerConnection() {
  if (trackerDbConfigError) {
    throw trackerDbConfigError;
  }

  if (trackerConnection?.readyState === 1) {
    return trackerConnection;
  }

  if (trackerConnectionPromise) {
    return trackerConnectionPromise;
  }

  let dbUrl;
  try {
    dbUrl = createMongoDbUrl({
      dbName: TRACKER_DB_NAME,
      appName: TRACKER_DB_NAME,
      password: process.env.MONGODB,
    });
  } catch (error) {
    trackerDbConfigError = error;
    throw error;
  }

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
