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
  const parsedPage = Number.parseInt(req.query.page, 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100
      ? parsedLimit
      : 50;
  const skip = (page - 1) * limit;
  const appLetters = {
    blog: "B",
    quiz: "Q",
    landing: "L",
    slapp: "S",
  };
  const appOrder = Object.keys(appLetters);

  const getAppSortOrder = (appName) => {
    const index = appOrder.indexOf(appName);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  const buildRouteBreakdown = (routeCollections = []) => {
    const routeTotals = new Map();

    for (const collection of routeCollections) {
      const appName = collection?.appName;
      const routeEntries = Array.isArray(collection?.routes)
        ? collection.routes
        : [];

      for (const entry of routeEntries) {
        if (!entry || typeof entry.k !== "string") {
          continue;
        }

        const decodedRoute = decodeRouteKey(entry.k);
        const count = Number.isFinite(entry.v) ? entry.v : Number(entry.v) || 0;
        if (count <= 0) {
          continue;
        }

        const existing = routeTotals.get(decodedRoute) || {
          route: decodedRoute,
          total: 0,
          apps: new Map(),
        };

        existing.total += count;
        existing.apps.set(appName, (existing.apps.get(appName) || 0) + count);
        routeTotals.set(decodedRoute, existing);
      }
    }

    return [...routeTotals.values()]
      .sort((a, b) => b.total - a.total || a.route.localeCompare(b.route))
      .map((routeInfo) => {
        const appBreakdown = [...routeInfo.apps.entries()]
          .sort(
            (a, b) =>
              getAppSortOrder(a[0]) - getAppSortOrder(b[0]) ||
              String(a[0] || "").localeCompare(String(b[0] || "")),
          )
          .map(([appName, count]) => ({
            appName,
            letter:
              appLetters[appName] ||
              (typeof appName === "string" && appName.length > 0
                ? appName[0].toUpperCase()
                : "?"),
            count,
          }));

        return {
          route: routeInfo.route,
          total: routeInfo.total,
          apps: appBreakdown,
        };
      });
  };

  const validSortFields = [
    "createdAt",
    "updatedAt",
    "timesVisited",
    "country",
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

  const sortFieldMap = {
    createdAt: "firstSeenAt",
    updatedAt: "lastSeenAt",
    timesVisited: "timesVisited",
    country: "country",
    goodRouteCount: "goodRouteCount",
    badRouteCount: "badRouteCount",
  };
  const sortField = sortFieldMap[sortBy] || "lastSeenAt";

  const trackerRows = await Tracker.aggregate([
    { $match: filter },
    { $sort: { updatedAt: -1 } },
    {
      $project: {
        ip: 1,
        appName: 1,
        country: 1,
        timesVisited: 1,
        lastIsLocalDev: 1,
        updatedAt: 1,
        createdAt: 1,
        goodRouteValues: { $objectToArray: { $ifNull: ["$goodRoutes", {}] } },
        badRouteValues: { $objectToArray: { $ifNull: ["$badRoutes", {}] } },
      },
    },
    {
      $project: {
        ip: 1,
        appName: 1,
        country: 1,
        timesVisited: 1,
        lastIsLocalDev: 1,
        updatedAt: 1,
        createdAt: 1,
        goodRouteValues: 1,
        badRouteValues: 1,
        goodRouteCountAllTime: { $sum: "$goodRouteValues.v" },
        badRouteCountAllTime: { $sum: "$badRouteValues.v" },
      },
    },
    {
      $group: {
        _id: "$ip",
        country: { $first: "$country" },
        timesVisited: { $sum: "$timesVisited" },
        goodRouteCount: { $sum: "$goodRouteCountAllTime" },
        badRouteCount: { $sum: "$badRouteCountAllTime" },
        hasLocalDev: {
          $max: {
            $cond: [{ $eq: ["$lastIsLocalDev", true] }, 1, 0],
          },
        },
        firstSeenAt: { $min: "$createdAt" },
        lastSeenAt: { $max: "$updatedAt" },
        goodRouteCollections: {
          $push: {
            appName: "$appName",
            routes: "$goodRouteValues",
          },
        },
        badRouteCollections: {
          $push: {
            appName: "$appName",
            routes: "$badRouteValues",
          },
        },
      },
    },
    { $sort: { [sortField]: sortOrder, _id: 1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  const trackerData = trackerRows.map((row) => ({
    ...row,
    ip: row._id,
    hasLocalDev: Boolean(row.hasLocalDev),
    goodRoutes: buildRouteBreakdown(row.goodRouteCollections),
    badRoutes: buildRouteBreakdown(row.badRouteCollections),
  }));

  const [trackerCount] = await Tracker.aggregate([
    { $match: filter },
    { $group: { _id: "$ip" } },
    { $count: "total" },
  ]);
  const totalTrackerEntries = trackerCount?.total || 0;
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
  const parsedBadToGoodRatioThreshold = Number.parseFloat(
    process.env.TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD || "1.7",
  );
  const badToGoodRatioThreshold =
    Number.isFinite(parsedBadToGoodRatioThreshold) &&
    parsedBadToGoodRatioThreshold > 0
      ? parsedBadToGoodRatioThreshold
      : 1.7;

  res.render("admin/flaggedIPs", {
    title: "Flagged IPs",
    flaggedIPs,
    flagThreshold:
      Number.parseInt(process.env.TRACKER_FLAG_THRESHOLD || "10", 10) || 10,
    badToGoodRatioThreshold,
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
