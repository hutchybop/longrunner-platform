import Tracker from "../models/tracker.js";
import {
  blockIpAddress,
  unblockIpAddress,
  getBlockedIps,
} from "@longrunner/shared-tracker";

const validApps = ["blog", "slapp", "quiz", "landing"];

export const dashboard = async (req, res) => {
  const selectedApp = req.query.app || "all";

  const filter = selectedApp !== "all" ? { appName: selectedApp } : {};

  const statsArray = await Tracker.aggregate([
    { $match: filter },
    {
      $project: {
        goodRouteValues: { $objectToArray: "$goodRoutes" },
        badRouteValues: { $objectToArray: "$badRoutes" },
        ip: 1,
        appName: 1,
      },
    },
    {
      $project: {
        goodSum: { $sum: "$goodRouteValues.v" },
        badSum: { $sum: "$badRouteValues.v" },
        ip: 1,
        appName: 1,
      },
    },
    {
      $group: {
        _id: null,
        totalGoodRoutes: { $sum: "$goodSum" },
        totalBadRoutes: { $sum: "$badSum" },
        uniqueIPs: { $addToSet: "$ip" },
      },
    },
    {
      $project: {
        _id: 0,
        totalGoodRoutes: 1,
        totalBadRoutes: 1,
        totalRoutes: { $sum: ["$totalGoodRoutes", "$totalBadRoutes"] },
        numberOfUniqueIPs: { $size: "$uniqueIPs" },
      },
    },
  ]);

  const stats = statsArray[0] || {
    totalGoodRoutes: 0,
    totalBadRoutes: 0,
    totalRoutes: 0,
    numberOfUniqueIPs: 0,
  };

  const countryStats = await Tracker.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$country",
        count: { $sum: "$timesVisited" },
        uniqueIPs: { $addToSet: "$ip" },
      },
    },
    {
      $addFields: {
        uniqueIPCount: { $size: "$uniqueIPs" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const routeStats = await Tracker.aggregate([
    { $match: filter },
    {
      $project: {
        good: { $objectToArray: "$goodRoutes" },
        bad: { $objectToArray: "$badRoutes" },
      },
    },
    {
      $project: {
        routes: { $concatArrays: ["$good", "$bad"] },
      },
    },
    { $unwind: "$routes" },
    {
      $group: {
        _id: "$routes.k",
        total: { $sum: "$routes.v" },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 10 },
  ]);

  const appStats = await Tracker.aggregate([
    {
      $group: {
        _id: "$appName",
        totalRequests: { $sum: "$timesVisited" },
        uniqueIPs: { $addToSet: "$ip" },
      },
    },
    {
      $addFields: {
        uniqueIPCount: { $size: "$uniqueIPs" },
      },
    },
    { $sort: { totalRequests: -1 } },
  ]);

  res.render("admin/dashboard", {
    title: "Tracker Dashboard",
    stats,
    countryStats,
    routeStats,
    appStats,
    selectedApp,
    validApps,
  });
};

export const tracker = async (req, res) => {
  const selectedApp = req.query.app || "all";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const filter = selectedApp !== "all" ? { appName: selectedApp } : {};

  const statsArray = await Tracker.aggregate([
    { $match: filter },
    {
      $project: {
        goodRouteValues: { $objectToArray: "$goodRoutes" },
        badRouteValues: { $objectToArray: "$badRoutes" },
        ip: 1,
        appName: 1,
      },
    },
    {
      $project: {
        goodSum: { $sum: "$goodRouteValues.v" },
        badSum: { $sum: "$badRouteValues.v" },
        ip: 1,
        appName: 1,
      },
    },
    {
      $group: {
        _id: null,
        totalGoodRoutes: { $sum: "$goodSum" },
        totalBadRoutes: { $sum: "$badSum" },
        uniqueIPs: { $addToSet: "$ip" },
      },
    },
    {
      $project: {
        _id: 0,
        totalGoodRoutes: 1,
        totalBadRoutes: 1,
        totalRoutes: { $sum: ["$totalGoodRoutes", "$totalBadRoutes"] },
        numberOfUniqueIPs: { $size: "$uniqueIPs" },
      },
    },
  ]);

  const stats = statsArray[0] || {
    totalGoodRoutes: 0,
    totalBadRoutes: 0,
    totalRoutes: 0,
    numberOfUniqueIPs: 0,
  };

  const countryStats = await Tracker.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$country",
        count: { $sum: "$timesVisited" },
        uniqueIPs: { $addToSet: "$ip" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const routeStats = await Tracker.aggregate([
    { $match: filter },
    {
      $project: {
        good: { $objectToArray: "$goodRoutes" },
        bad: { $objectToArray: "$badRoutes" },
      },
    },
    {
      $project: {
        routes: { $concatArrays: ["$good", "$bad"] },
      },
    },
    { $unwind: "$routes" },
    {
      $group: {
        _id: "$routes.k",
        total: { $sum: "$routes.v" },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 10 },
  ]);

  const trackerData = await Tracker.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalTrackerEntries = await Tracker.countDocuments(filter);
  const totalPages = Math.ceil(totalTrackerEntries / limit);

  res.render("admin/tracker", {
    title: "Tracker Analytics",
    stats,
    countryStats,
    trackerData,
    routeStats,
    selectedApp,
    validApps,
    pagination: {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      limit,
    },
  });
};

export const blockedIPs = async (req, res) => {
  const blockedIPs = await getBlockedIps();
  res.render("admin/blockedIPs", {
    title: "Blocked IPs",
    blockedIPs,
  });
};

export const blockIP = async (req, res) => {
  const ip = req.body.ip || req.body.origIP;
  const success = await blockIpAddress(ip);
  if (success) {
    req.flash("success", `IP ${ip} has been blocked`);
  } else {
    req.flash("error", `Failed to block IP ${ip}`);
  }
  res.redirect("back");
};

export const unblockIP = async (req, res) => {
  const ip = req.body.origIP || req.body.ip;
  const success = await unblockIpAddress(ip);
  if (success) {
    req.flash("success", `IP ${ip} has been unblocked`);
  } else {
    req.flash("error", `Failed to unblock IP ${ip}`);
  }
  res.redirect("back");
};
