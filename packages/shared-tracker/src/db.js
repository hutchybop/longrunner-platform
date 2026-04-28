import mongoose from "mongoose";
import { createMongoDbUrl } from "@longrunner/shared-config";

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
      appName: "longrunnerTracker",
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
