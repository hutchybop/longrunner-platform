import Tracker from "../models/tracker.js";
import {
  blockIpAddress,
  decodeRouteKey,
  getFlaggedIps,
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

  const decodedRouteStats = routeStats.map((route) => ({
    ...route,
    _id: decodeRouteKey(route._id),
  }));

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
    routeStats: decodedRouteStats,
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

  const validSortFields = [
    "createdAt",
    "updatedAt",
    "timesVisited",
    "country",
    "city",
    "goodRouteCount",
    "badRouteCount",
  ];
  const sortBy = validSortFields.includes(req.query.sortBy)
    ? req.query.sortBy
    : "updatedAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

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

  const decodedRouteStats = routeStats.map((route) => ({
    ...route,
    _id: decodeRouteKey(route._id),
  }));

  let trackerData;
  if (sortBy === "goodRouteCount" || sortBy === "badRouteCount") {
    const sortField =
      sortBy === "goodRouteCount"
        ? "computedGoodRouteCount"
        : "computedBadRouteCount";

    trackerData = await Tracker.aggregate([
      { $match: filter },
      {
        $addFields: {
          computedGoodRouteCount: {
            $size: { $objectToArray: { $ifNull: ["$goodRoutes", {}] } },
          },
          computedBadRouteCount: {
            $size: { $objectToArray: { $ifNull: ["$badRoutes", {}] } },
          },
        },
      },
      { $sort: { [sortField]: sortOrder, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);
  } else {
    trackerData = await Tracker.find(filter)
      .sort({ [sortBy]: sortOrder, createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  for (const visitor of trackerData) {
    const goodRouteEntries =
      visitor.goodRoutes instanceof Map
        ? visitor.goodRoutes.entries()
        : Object.entries(visitor.goodRoutes || {});
    const decodedGoodRoutes = new Map();
    for (const [routeKey, count] of goodRouteEntries) {
      decodedGoodRoutes.set(decodeRouteKey(routeKey), count);
    }
    visitor.goodRoutes = decodedGoodRoutes;
    visitor.goodRouteCount = decodedGoodRoutes.size;

    const badRouteEntries =
      visitor.badRoutes instanceof Map
        ? visitor.badRoutes.entries()
        : Object.entries(visitor.badRoutes || {});
    const decodedBadRoutes = new Map();
    for (const [routeKey, count] of badRouteEntries) {
      decodedBadRoutes.set(decodeRouteKey(routeKey), count);
    }
    visitor.badRoutes = decodedBadRoutes;
    visitor.badRouteCount = decodedBadRoutes.size;
  }

  const totalTrackerEntries = await Tracker.countDocuments(filter);
  const totalPages = Math.ceil(totalTrackerEntries / limit);

  res.render("admin/tracker", {
    title: "Tracker Analytics",
    stats,
    countryStats,
    trackerData,
    routeStats: decodedRouteStats,
    selectedApp,
    validApps,
    pagination: {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      limit,
    },
    sort: {
      field: sortBy,
      order: sortOrder === 1 ? "asc" : "desc",
      nextOrder: sortOrder === 1 ? "desc" : "asc",
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

export const flaggedIPs = async (req, res) => {
  const flaggedIPs = await getFlaggedIps();

  res.render("admin/flaggedIPs", {
    title: "Flagged IPs",
    flaggedIPs,
    rollingWindowHours:
      Number.parseInt(process.env.TRACKER_BAD_ROUTE_WINDOW_HOURS || "24", 10) ||
      24,
    flagThreshold:
      Number.parseInt(process.env.TRACKER_FLAG_THRESHOLD || "10", 10) || 10,
    whitelistRaw: process.env.IP_WHITE_LIST || "",
  });
};

export const blockIP = async (req, res) => {
  const ip = req.body.ip || req.body.origIP;
  const result = await blockIpAddress(ip);
  if (result.ok) {
    req.flash("success", `IP ${ip} has been blocked`);
  } else if (result.status === "invalid_ip") {
    req.flash("error", `Invalid IP address format: ${ip}`);
  } else if (result.status === "whitelisted") {
    req.flash("error", `IP ${ip} is in the whitelist and cannot be blocked`);
  } else {
    req.flash("error", `Failed to block IP ${ip}`);
  }
  const referer = req.get("referer") || req.get("referrer");
  res.redirect(referer || "/admin/blocked-ips");
};

export const unblockIP = async (req, res) => {
  const ip = req.body.origIP || req.body.ip;
  const result = await unblockIpAddress(ip);
  if (result.ok) {
    req.flash("success", `IP ${ip} has been unblocked`);
  } else if (result.status === "invalid_ip") {
    req.flash("error", `Invalid IP address format: ${ip}`);
  } else if (result.status === "not_found") {
    req.flash("error", `IP ${ip} was not found in the block list`);
  } else {
    req.flash("error", `Failed to unblock IP ${ip}`);
  }
  const referer = req.get("referer") || req.get("referrer");
  res.redirect(referer || "/admin/blocked-ips");
};
