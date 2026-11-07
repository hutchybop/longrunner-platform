import { mongoose } from "mongoose";
import TrackerUser from "../models/trackerUser.js";

export const populateTrackerUser = async (req, res, next) => {
  try {
    req.trackerUser = null;

    if (!req.session?.trackerUserId) {
      res.locals.trackerUser = null;
      return next();
    }

    const userId = req.session.trackerUserId.toString();
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      delete req.session.trackerUserId;
      res.locals.trackerUser = null;
      return next();
    }

    const trackerUser = await TrackerUser.findById(userId);
    if (!trackerUser) {
      delete req.session.trackerUserId;
      res.locals.trackerUser = null;
      return next();
    }

    req.trackerUser = trackerUser;
    res.locals.trackerUser = trackerUser;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireTrackerAuth = (req, res, next) => {
  if (!req.trackerUser || !req.session?.trackerUserId) {
    req.session.returnTo = req.originalUrl;
    req.flash("error", "You must be signed in");
    return res.redirect("/auth/login");
  }

  if (req.trackerUser._id.toString() !== req.session.trackerUserId.toString()) {
    delete req.session.trackerUserId;
    req.session.returnTo = req.originalUrl;
    req.flash("error", "You must be signed in");
    return res.redirect("/auth/login");
  }

  return next();
};

export const loginTrackerUser = async (req, user) => {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.trackerUserId = user._id;
      req.trackerUser = user;
      resolve();
    });
  });
};

export const logoutTrackerUser = async (req) => {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
