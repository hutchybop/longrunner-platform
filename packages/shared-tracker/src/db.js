import mongoose from "mongoose";
import { createMongoDbUrl } from "@longrunner/shared-config";

const TRACKER_DB_NAME = process.env.MONGODB_DB_NAME || "longrunner-platform";
let fallbackConnectPromise = null;

export async function getTrackerConnection() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    return mongoose.connection.asPromise();
  }

  if (!fallbackConnectPromise) {
    const dbUrl = createMongoDbUrl({
      dbName: TRACKER_DB_NAME,
      appName: TRACKER_DB_NAME,
      password: process.env.MONGODB,
    });

    fallbackConnectPromise = mongoose
      .connect(dbUrl, {
        serverSelectionTimeoutMS: 5000,
      })
      .then(() => mongoose.connection)
      .finally(() => {
        fallbackConnectPromise = null;
      });
  }

  return fallbackConnectPromise;
}
