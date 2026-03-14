import mongoose from "mongoose";

const TRACKER_EVENT_RETENTION_DAYS =
  Number.parseInt(process.env.TRACKER_EVENT_RETENTION_DAYS || "30", 10) || 30;

const trackerEventSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      index: true,
      default: "UNKNOWN",
    },
    appName: {
      type: String,
      required: true,
      index: true,
    },
    country: {
      type: String,
      default: "UNKNOWN",
    },
    city: {
      type: String,
      default: "UNKNOWN",
    },
    userAgent: {
      type: String,
      default: "UNKNOWN",
    },
    route: {
      type: String,
      default: "UNKNOWN",
    },
    method: {
      type: String,
      default: "UNKNOWN",
    },
    statusCode: {
      type: Number,
      default: 0,
    },
    isGoodRoute: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

trackerEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: TRACKER_EVENT_RETENTION_DAYS * 24 * 60 * 60 },
);
trackerEventSchema.index({ appName: 1, createdAt: -1 });
trackerEventSchema.index({ ip: 1, appName: 1, createdAt: -1 });

const TrackerEvent = mongoose.model("TrackerEvent", trackerEventSchema);

export default TrackerEvent;
