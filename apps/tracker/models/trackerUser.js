import mongoose from "mongoose";

const trackerUserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const TrackerUser = mongoose.model(
  "TrackerUser",
  trackerUserSchema,
  "tracker_users",
);

export default TrackerUser;
