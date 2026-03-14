import Tracker from "../models/tracker.js";
import TrackerEvent from "../models/trackerEvent.js";
import {
  blockIP as blockIpAddress,
  unblockIP as unblockIpAddress,
  getBlockedIPs,
} from "../utils/blockedIPMiddleware.js";

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
  const blockedIPs = await getBlockedIPs();
  res.render("admin/blockedIPs", {
    title: "Blocked IPs",
    blockedIPs,
  });
};

const ingestTrackData = async (input = {}) => {
  const {
    appName,
    ip,
    country,
    city,
    userAgent,
    route,
    method,
    statusCode,
    isGoodRoute,
  } = input;

  if (!validApps.includes(appName)) {
    return { ok: false, status: 400, error: "Invalid app name" };
  }

  const safeIp = ip || "UNKNOWN";
  const safeCountry = country || "UNKNOWN";
  const safeCity = city || "UNKNOWN";
  const safeUserAgent = userAgent || "UNKNOWN";
  const safeRoute = route || "UNKNOWN";
  const safeMethod = method || "UNKNOWN";
  const safeStatusCode = Number.isInteger(statusCode) ? statusCode : 0;
  const calculatedGoodRoute =
    typeof isGoodRoute === "boolean"
      ? isGoodRoute
      : (safeMethod === "GET" && safeStatusCode < 400) || safeRoute === "/";

  await TrackerEvent.create({
    ip: safeIp,
    appName,
    country: safeCountry,
    city: safeCity,
    userAgent: safeUserAgent,
    route: safeRoute,
    method: safeMethod,
    statusCode: safeStatusCode,
    isGoodRoute: calculatedGoodRoute,
  });

  let tracker = await Tracker.findOne({ ip: safeIp, appName });

  if (!tracker) {
    tracker = new Tracker({
      ip: safeIp,
      appName,
      country: safeCountry,
      city: safeCity,
      userAgent: safeUserAgent,
      timesVisited: 1,
      isFirstVisit: true,
    });
  } else {
    tracker.timesVisited++;
    tracker.lastVisitDate = new Date().toLocaleDateString("en-GB");
    tracker.lastVisitTime = new Date().toLocaleTimeString("en-GB", {
      hour12: false,
    });
    tracker.isFirstVisit = false;
    tracker.userAgent = safeUserAgent || tracker.userAgent;

    if (tracker.ip === "UNKNOWN" && safeIp !== "UNKNOWN") tracker.ip = safeIp;
    if (tracker.country === "UNKNOWN" && safeCountry !== "UNKNOWN")
      tracker.country = safeCountry;
    if (tracker.city === "UNKNOWN" && safeCity !== "UNKNOWN")
      tracker.city = safeCity;
  }

  const routeMap = calculatedGoodRoute ? tracker.goodRoutes : tracker.badRoutes;
  const current = routeMap.get(safeRoute) || 0;
  routeMap.set(safeRoute, current + 1);

  await tracker.save();

  return { ok: true };
};

export const trackApi = async (req, res) => {
  try {
    const result = await ingestTrackData(req.body || {});

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Track API error:", error);
    return res.status(500).json({ error: "Failed to track request" });
  }
};

export const getBlockedIPsApi = async (req, res) => {
  const blockedIps = await getBlockedIPs();
  res.json({ blockedIps });
};

export const trackRequest = async (req, res, next) => {
  try {
    const { appName } = req.params;
    const ip = req.ipInfo?.ip || req.ip || "UNKNOWN";
    const country = req.ipInfo?.country || "UNKNOWN";
    const city = req.ipInfo?.city || "UNKNOWN";
    const userAgent = req.get("User-Agent") || "UNKNOWN";
    const route = req.route?.path || req.originalUrl;
    const method = req.method;
    const statusCode = res.statusCode;

    if (!validApps.includes(appName)) {
      return next();
    }

    await ingestTrackData({
      appName,
      ip,
      country,
      city,
      userAgent,
      route,
      method,
      statusCode,
    });
  } catch (error) {
    console.error("Track request error:", error);
  }

  next();
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
