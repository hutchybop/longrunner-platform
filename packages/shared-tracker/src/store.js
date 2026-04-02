import mongoose from "mongoose";
import net from "net";
import { mail } from "@longrunner/shared-utils";
import { getTrackerConnection } from "./db.js";

const trackerSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      index: true,
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
    timesVisited: {
      type: Number,
      default: 1,
    },
    lastVisitDate: {
      type: String,
      default: () => new Date().toLocaleDateString("en-GB"),
    },
    lastVisitTime: {
      type: String,
      default: () => new Date().toLocaleTimeString("en-GB", { hour12: false }),
    },
    goodRoutes: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    badRoutes: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    goodRouteCount: {
      type: Number,
      default: 0,
    },
    badRouteCount: {
      type: Number,
      default: 0,
    },
    userAgent: {
      type: String,
      default: "UNKNOWN",
    },
    isFirstVisit: {
      type: Boolean,
      default: true,
    },
    lastEnvironment: {
      type: String,
      default: "development",
    },
    lastHost: {
      type: String,
      default: "UNKNOWN",
    },
    lastIsLocalDev: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

trackerSchema.index({ ip: 1, appName: 1 }, { unique: true });
trackerSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);
trackerSchema.index({ appName: 1, updatedAt: -1 });

const TRACKER_EVENT_RETENTION_DAYS =
  Number.parseInt(process.env.TRACKER_EVENT_RETENTION_DAYS || "30", 10) || 30;

const TRACKER_FLAG_THRESHOLD =
  Number.parseInt(process.env.TRACKER_FLAG_THRESHOLD || "10", 10) || 10;
const TRACKER_BLOCK_30M_THRESHOLD =
  Number.parseInt(process.env.TRACKER_BLOCK_30M_THRESHOLD || "20", 10) || 20;
const TRACKER_BLOCK_24H_THRESHOLD =
  Number.parseInt(process.env.TRACKER_BLOCK_24H_THRESHOLD || "50", 10) || 50;
const TRACKER_BLOCK_30M_DURATION_MINUTES =
  Number.parseInt(process.env.TRACKER_BLOCK_30M_DURATION_MINUTES || "30", 10) ||
  30;
const TRACKER_BLOCK_24H_DURATION_HOURS =
  Number.parseInt(process.env.TRACKER_BLOCK_24H_DURATION_HOURS || "24", 10) ||
  24;
const parsedBadToGoodRatioThreshold = Number.parseFloat(
  process.env.TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD || "1.7",
);
const TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD =
  Number.isFinite(parsedBadToGoodRatioThreshold) &&
  parsedBadToGoodRatioThreshold > 0
    ? parsedBadToGoodRatioThreshold
    : 1.7;
const TRACKER_WEEKLY_SUMMARY_TIMEZONE =
  process.env.TRACKER_WEEKLY_SUMMARY_TIMEZONE || "Europe/London";
const TRACKER_WEEKLY_SUMMARY_EMAIL_ENABLED =
  String(process.env.TRACKER_WEEKLY_SUMMARY_EMAIL_ENABLED || "false") ===
  "true";
const TRACKER_WEEKLY_SUMMARY_EMAIL_TO =
  process.env.TRACKER_WEEKLY_SUMMARY_EMAIL_TO ||
  process.env.TRACKER_AUTO_BLOCK_NOTIFY_TO ||
  "";
const TRACKER_WEEKLY_SUMMARY_EMAIL_TIME =
  process.env.TRACKER_WEEKLY_SUMMARY_EMAIL_TIME || "00:05";

function parseEmailScheduleTime(rawValue) {
  const value = String(rawValue || "").trim();
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return {
      hour: 0,
      minute: 5,
      label: "00:05",
    };
  }

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return {
      hour: 0,
      minute: 5,
      label: "00:05",
    };
  }

  return {
    hour,
    minute,
    label: `${pad2(hour)}:${pad2(minute)}`,
  };
}

const TRACKER_WEEKLY_SUMMARY_EMAIL_SCHEDULE = parseEmailScheduleTime(
  TRACKER_WEEKLY_SUMMARY_EMAIL_TIME,
);

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
    environment: {
      type: String,
      default: "development",
    },
    host: {
      type: String,
      default: "UNKNOWN",
    },
    isLocalDev: {
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

const ipBlockSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["manual", "auto"],
      default: "manual",
    },
    reason: {
      type: String,
      default: "",
    },
    blockLevel: {
      type: String,
      enum: ["manual", "temporary_30m", "temporary_24h", "permanent"],
      default: "manual",
    },
    badRouteCountAtBlock: {
      type: Number,
      default: 0,
    },
    blockedAt: {
      type: Date,
      default: () => new Date(),
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
    isPermanent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

ipBlockSchema.index({ blockedUntil: 1 });

const trackerBlockEventSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["manual", "auto"],
      default: "auto",
      index: true,
    },
    blockLevel: {
      type: String,
      enum: ["manual", "temporary_30m", "temporary_24h", "permanent"],
      required: true,
      index: true,
    },
    blockedAt: {
      type: Date,
      required: true,
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
    badRouteCountAtBlock: {
      type: Number,
      default: 0,
    },
    goodRouteCountAtBlock: {
      type: Number,
      default: 0,
    },
    ratioThreshold: {
      type: Number,
      default: TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD,
    },
    reason: {
      type: String,
      default: "",
    },
    weekKey: {
      type: String,
      required: true,
      index: true,
    },
    weekStartDate: {
      type: String,
      required: true,
    },
    weekEndDate: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

trackerBlockEventSchema.index({ ip: 1, blockedAt: -1 });
trackerBlockEventSchema.index({ weekKey: 1, blockLevel: 1 });
trackerBlockEventSchema.index({ source: 1, weekKey: 1 });

const trackerWeeklyIpSummarySchema = new mongoose.Schema(
  {
    weekKey: {
      type: String,
      required: true,
      index: true,
    },
    weekStartDate: {
      type: String,
      required: true,
    },
    weekEndDate: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      required: true,
      index: true,
    },
    has30m: {
      type: Boolean,
      default: false,
    },
    has24h: {
      type: Boolean,
      default: false,
    },
    hasPermanent: {
      type: Boolean,
      default: false,
    },
    blocked30mAt: {
      type: Date,
      default: null,
    },
    blocked24hAt: {
      type: Date,
      default: null,
    },
    blockedPermanentAt: {
      type: Date,
      default: null,
    },
    lastBlockLevel: {
      type: String,
      enum: ["manual", "temporary_30m", "temporary_24h", "permanent"],
      default: "temporary_30m",
    },
    lastBlockedAt: {
      type: Date,
      default: null,
    },
    lastBlockedUntil: {
      type: Date,
      default: null,
    },
    badRouteCountAllTime: {
      type: Number,
      default: 0,
    },
    goodRouteCountAllTime: {
      type: Number,
      default: 0,
    },
    ratioThreshold: {
      type: Number,
      default: TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD,
    },
  },
  {
    timestamps: true,
  },
);

trackerWeeklyIpSummarySchema.index({ weekKey: 1, ip: 1 }, { unique: true });
trackerWeeklyIpSummarySchema.index({ weekKey: 1, lastBlockedAt: -1 });

const trackerIpBlockLifecycleSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    has30m: {
      type: Boolean,
      default: false,
    },
    has24h: {
      type: Boolean,
      default: false,
    },
    hasPermanent: {
      type: Boolean,
      default: false,
    },
    blocked30mAt: {
      type: Date,
      default: null,
    },
    blocked24hAt: {
      type: Date,
      default: null,
    },
    blockedPermanentAt: {
      type: Date,
      default: null,
    },
    lastBlockLevel: {
      type: String,
      enum: ["manual", "temporary_30m", "temporary_24h", "permanent"],
      default: "temporary_30m",
    },
    lastBlockedAt: {
      type: Date,
      default: null,
    },
    lastBlockedUntil: {
      type: Date,
      default: null,
    },
    badRouteCountAllTime: {
      type: Number,
      default: 0,
    },
    goodRouteCountAllTime: {
      type: Number,
      default: 0,
    },
    ratioThreshold: {
      type: Number,
      default: TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD,
    },
  },
  {
    timestamps: true,
  },
);

trackerIpBlockLifecycleSchema.index({ hasPermanent: 1, has24h: 1, has30m: 1 });

const trackerWeeklySummaryEmailLogSchema = new mongoose.Schema(
  {
    weekKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["sending", "sent"],
      default: "sending",
    },
    recipients: {
      type: [String],
      default: [],
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

function sanitizeRouteKey(route) {
  return String(route)
    .replaceAll("%", "%25")
    .replaceAll(".", "%2E")
    .replaceAll("$", "%24");
}

function decodeRouteKey(route) {
  return String(route)
    .replaceAll("%24", "$")
    .replaceAll("%2E", ".")
    .replaceAll("%25", "%");
}

const SUMMARY_WEEKDAY_TO_INDEX = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toIsoDateString(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate(),
  )}`;
}

function addDaysToIsoDate(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDateString(date);
}

function getWeekInfoForDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TRACKER_WEEKLY_SUMMARY_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const dayIndex = SUMMARY_WEEKDAY_TO_INDEX[partMap.weekday] ?? 0;
  const year = Number.parseInt(partMap.year, 10);
  const month = Number.parseInt(partMap.month, 10);
  const day = Number.parseInt(partMap.day, 10);

  const weekStartDateObj = new Date(Date.UTC(year, month - 1, day, 12));
  weekStartDateObj.setUTCDate(weekStartDateObj.getUTCDate() - dayIndex);

  const weekStartDate = toIsoDateString(weekStartDateObj);
  const weekEndDate = addDaysToIsoDate(weekStartDate, 6);

  return {
    weekKey: weekStartDate,
    weekStartDate,
    weekEndDate,
  };
}

function getWeekInfoFromWeekKey(weekKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(weekKey || ""))) {
    return null;
  }

  const parsed = new Date(`${weekKey}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (toIsoDateString(parsed) !== weekKey) {
    return null;
  }

  if (parsed.getUTCDay() !== 1) {
    return null;
  }

  return {
    weekKey,
    weekStartDate: weekKey,
    weekEndDate: addDaysToIsoDate(weekKey, 6),
  };
}

function formatIsoDateToDisplay(isoDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate || ""))) {
    return "N/A";
  }

  const [year, month, day] = isoDate.split("-");
  return `${day} ${month} ${year.slice(2)}`;
}

function getDatePartsInTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function formatDateTimeForEmail(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  const parts = getDatePartsInTimeZone(date, TRACKER_WEEKLY_SUMMARY_TIMEZONE);
  return `${parts.hour}:${parts.minute} ${parts.day} ${parts.month} ${parts.year}`;
}

function parseRecipients(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return [];
  }

  return [
    ...new Set(
      rawValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function buildWeeklySummaryEmailBody(summaryData) {
  const lines = [
    "Your weekly Tracker summary from tracker.longrunner.co.uk",
    "",
    `Weekly Totals (${summaryData.selectedWeek.weekLabelDate})`,
    "",
    `Total Weekly 30min Only Blocks: ${summaryData.weeklyTotals.total30mOnlyBlocks}`,
    `Total Weekly 30min & 24hr Only Blocks: ${summaryData.weeklyTotals.total30mAnd24hOnlyBlocks}`,
    `Total Weekly Permanent Blocks: ${summaryData.weeklyTotals.totalPermanentBlocks}`,
    "",
    "All Time Totals",
    "",
    `Total 30min Only Blocks: ${summaryData.allTimeTotals.total30mOnlyBlocks}`,
    `Total 30min & 24hr Only Blocks: ${summaryData.allTimeTotals.total30mAnd24hOnlyBlocks}`,
    `Total Permanent Blocks: ${summaryData.allTimeTotals.totalPermanentBlocks}`,
    "",
    "IP addresses blocked this week:",
    "",
  ];

  if (summaryData.weeklyIps.length === 0) {
    lines.push("No auto-blocked IPs for this week.");
    return lines.join("\n");
  }

  summaryData.weeklyIps.forEach((item, index) => {
    lines.push(`${item.ip}:`);
    lines.push(
      `30 min temp blocked at: ${formatDateTimeForEmail(item.blocked30mAt)}`,
    );
    lines.push(
      `24hr temp blocked at: ${formatDateTimeForEmail(item.blocked24hAt)}`,
    );
    lines.push(
      `Perm blocked at: ${formatDateTimeForEmail(item.blockedPermanentAt)}`,
    );
    lines.push(`Bad routes (all-time): ${item.badRouteCountAllTime}`);
    lines.push(`Good routes (all-time): ${item.goodRouteCountAllTime}`);
    lines.push(`Bad/Good ratio threshold: ${item.ratioThreshold}`);

    if (index < summaryData.weeklyIps.length - 1) {
      lines.push("");
    }
  });

  return lines.join("\n");
}

function buildDefaultBlockTotals() {
  return {
    total30mOnlyBlocks: 0,
    total30mAnd24hOnlyBlocks: 0,
    totalPermanentBlocks: 0,
  };
}

async function getBlockTotals(Model, filter = {}) {
  const [totals] = await Model.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total30mOnlyBlocks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$has30m", true] },
                  { $ne: ["$has24h", true] },
                  { $ne: ["$hasPermanent", true] },
                ],
              },
              1,
              0,
            ],
          },
        },
        total30mAnd24hOnlyBlocks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$has24h", true] },
                  { $ne: ["$hasPermanent", true] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalPermanentBlocks: {
          $sum: {
            $cond: [{ $eq: ["$hasPermanent", true] }, 1, 0],
          },
        },
      },
    },
  ]);

  if (!totals) {
    return buildDefaultBlockTotals();
  }

  return {
    total30mOnlyBlocks: totals.total30mOnlyBlocks || 0,
    total30mAnd24hOnlyBlocks: totals.total30mAnd24hOnlyBlocks || 0,
    totalPermanentBlocks: totals.totalPermanentBlocks || 0,
  };
}

async function updateBlockProgressDocument({
  Model,
  filter,
  blockLevel,
  blockedAt,
  blockedUntil,
  badRouteCountAllTime,
  goodRouteCountAllTime,
  ratioThreshold,
  insertDefaults = {},
}) {
  const existing = await Model.findOne(filter).lean();

  const update = {
    lastBlockLevel: blockLevel,
    lastBlockedAt: blockedAt,
    lastBlockedUntil: blockedUntil || null,
    badRouteCountAllTime,
    goodRouteCountAllTime,
    ratioThreshold,
  };

  if (blockLevel === "temporary_30m") {
    update.has30m = true;
    if (!existing?.blocked30mAt) {
      update.blocked30mAt = blockedAt;
    }
  }

  if (blockLevel === "temporary_24h") {
    update.has24h = true;
    if (!existing?.blocked24hAt) {
      update.blocked24hAt = blockedAt;
    }
  }

  if (blockLevel === "permanent") {
    update.hasPermanent = true;
    if (!existing?.blockedPermanentAt) {
      update.blockedPermanentAt = blockedAt;
    }
  }

  const insertOnlyDefaults = Object.fromEntries(
    Object.entries(insertDefaults).filter(([key]) => !(key in update)),
  );
  const updateCommand = {
    $set: update,
    ...(Object.keys(insertOnlyDefaults).length > 0
      ? { $setOnInsert: insertOnlyDefaults }
      : {}),
  };

  try {
    await Model.updateOne(filter, updateCommand, {
      upsert: true,
    });
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    await Model.updateOne(filter, { $set: update });
  }
}

async function recordBlockTransition({
  TrackerBlockEvent,
  TrackerWeeklyIpSummary,
  TrackerIpBlockLifecycle,
  ip,
  blockLevel,
  blockedAt,
  blockedUntil,
  source,
  reason,
  badRouteCountAllTime,
  goodRouteCountAllTime,
}) {
  const weekInfo = getWeekInfoForDate(blockedAt);

  await TrackerBlockEvent.create({
    ip,
    source,
    blockLevel,
    blockedAt,
    blockedUntil: blockedUntil || null,
    badRouteCountAtBlock: badRouteCountAllTime,
    goodRouteCountAtBlock: goodRouteCountAllTime,
    ratioThreshold: TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD,
    reason,
    weekKey: weekInfo.weekKey,
    weekStartDate: weekInfo.weekStartDate,
    weekEndDate: weekInfo.weekEndDate,
  });

  await updateBlockProgressDocument({
    Model: TrackerWeeklyIpSummary,
    filter: {
      weekKey: weekInfo.weekKey,
      ip,
    },
    blockLevel,
    blockedAt,
    blockedUntil,
    badRouteCountAllTime,
    goodRouteCountAllTime,
    ratioThreshold: TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD,
    insertDefaults: {
      weekKey: weekInfo.weekKey,
      weekStartDate: weekInfo.weekStartDate,
      weekEndDate: weekInfo.weekEndDate,
      ip,
      has30m: false,
      has24h: false,
      hasPermanent: false,
      blocked30mAt: null,
      blocked24hAt: null,
      blockedPermanentAt: null,
    },
  });

  await updateBlockProgressDocument({
    Model: TrackerIpBlockLifecycle,
    filter: { ip },
    blockLevel,
    blockedAt,
    blockedUntil,
    badRouteCountAllTime,
    goodRouteCountAllTime,
    ratioThreshold: TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD,
    insertDefaults: {
      ip,
      has30m: false,
      has24h: false,
      hasPermanent: false,
      blocked30mAt: null,
      blocked24hAt: null,
      blockedPermanentAt: null,
    },
  });
}

function getModels(connection) {
  const Tracker =
    connection.models.Tracker ||
    connection.model("Tracker", trackerSchema, "trackers");

  const TrackerEvent =
    connection.models.TrackerEvent ||
    connection.model("TrackerEvent", trackerEventSchema, "trackerevents");

  const IpBlock =
    connection.models.IpBlock ||
    connection.model("IpBlock", ipBlockSchema, "ipblocks");

  const TrackerBlockEvent =
    connection.models.TrackerBlockEvent ||
    connection.model(
      "TrackerBlockEvent",
      trackerBlockEventSchema,
      "trackerblockevents",
    );

  const TrackerWeeklyIpSummary =
    connection.models.TrackerWeeklyIpSummary ||
    connection.model(
      "TrackerWeeklyIpSummary",
      trackerWeeklyIpSummarySchema,
      "trackerweeklyipsummaries",
    );

  const TrackerIpBlockLifecycle =
    connection.models.TrackerIpBlockLifecycle ||
    connection.model(
      "TrackerIpBlockLifecycle",
      trackerIpBlockLifecycleSchema,
      "trackeripblocklifecycles",
    );

  const TrackerWeeklySummaryEmailLog =
    connection.models.TrackerWeeklySummaryEmailLog ||
    connection.model(
      "TrackerWeeklySummaryEmailLog",
      trackerWeeklySummaryEmailLogSchema,
      "trackerweeklysummaryemaillogs",
    );

  return {
    Tracker,
    TrackerEvent,
    IpBlock,
    TrackerBlockEvent,
    TrackerWeeklyIpSummary,
    TrackerIpBlockLifecycle,
    TrackerWeeklySummaryEmailLog,
  };
}

function getCompletedWeekKeyForDate(date = new Date()) {
  const currentWeekInfo = getWeekInfoForDate(date);
  return addDaysToIsoDate(currentWeekInfo.weekKey, -7);
}

function isWeeklySummaryEmailDue(now = new Date()) {
  const parts = getDatePartsInTimeZone(now, TRACKER_WEEKLY_SUMMARY_TIMEZONE);
  if (parts.weekday !== "Monday") {
    return false;
  }

  const hour = Number.parseInt(parts.hour, 10);
  const minute = Number.parseInt(parts.minute, 10);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return false;
  }

  if (hour > TRACKER_WEEKLY_SUMMARY_EMAIL_SCHEDULE.hour) {
    return true;
  }

  return (
    hour === TRACKER_WEEKLY_SUMMARY_EMAIL_SCHEDULE.hour &&
    minute >= TRACKER_WEEKLY_SUMMARY_EMAIL_SCHEDULE.minute
  );
}

async function sendWeeklySummaryEmailForWeek({ weekKey }) {
  const weekInfo = getWeekInfoFromWeekKey(weekKey);
  if (!weekInfo) {
    return {
      ok: false,
      status: "invalid_week",
    };
  }

  const recipients = parseRecipients(TRACKER_WEEKLY_SUMMARY_EMAIL_TO);
  if (recipients.length === 0) {
    return {
      ok: false,
      status: "missing_recipients",
    };
  }

  const connection = await getTrackerConnection();
  const { TrackerWeeklySummaryEmailLog } = getModels(connection);

  try {
    await TrackerWeeklySummaryEmailLog.create({
      weekKey,
      status: "sending",
      recipients,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return {
        ok: true,
        status: "already_sent",
      };
    }
    throw error;
  }

  try {
    const summaryData = await getTrackerSummary({ weekKey });
    const subject = "Your weekly Tracker summary from tracker.longrunner.co.uk";
    const text = buildWeeklySummaryEmailBody(summaryData);

    await mail(subject, text, recipients.join(", "));

    await TrackerWeeklySummaryEmailLog.updateOne(
      { weekKey },
      {
        $set: {
          status: "sent",
          sentAt: new Date(),
          recipients,
        },
      },
    );

    return {
      ok: true,
      status: "sent",
      weekKey,
      recipients,
      scheduleTime: TRACKER_WEEKLY_SUMMARY_EMAIL_SCHEDULE.label,
      timeZone: TRACKER_WEEKLY_SUMMARY_TIMEZONE,
    };
  } catch (error) {
    await TrackerWeeklySummaryEmailLog.deleteOne({
      weekKey,
      status: "sending",
    });
    throw error;
  }
}

export async function sendWeeklySummaryEmailIfDue({ now = new Date() } = {}) {
  if (!TRACKER_WEEKLY_SUMMARY_EMAIL_ENABLED) {
    return {
      ok: false,
      status: "disabled",
    };
  }

  if (!isWeeklySummaryEmailDue(now)) {
    return {
      ok: false,
      status: "not_due",
    };
  }

  const weekKey = getCompletedWeekKeyForDate(now);
  return sendWeeklySummaryEmailForWeek({ weekKey });
}

function parseIpListEnv(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return new Set();
  }

  const normalized = rawValue.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!normalized) {
    return new Set();
  }

  const ips = normalized
    .split(",")
    .map((ip) => ip.trim().replace(/^['"]|['"]$/g, ""))
    .map((ip) => normalizeAndValidateIp(ip))
    .filter(Boolean);

  return new Set(ips);
}

function getIpWhitelistSet() {
  return parseIpListEnv(process.env.IP_WHITE_LIST);
}

export function getIpDevSet() {
  return parseIpListEnv(process.env.IP_DEV_LIST);
}

function getProtectedIpSet() {
  return new Set([...getIpWhitelistSet(), ...getIpDevSet()]);
}

function isProtectedIp(ip) {
  if (typeof ip !== "string") return false;
  return getProtectedIpSet().has(ip.trim());
}

function normalizeAndValidateIp(input) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("::ffff:")) {
    const mappedIp = trimmed.slice(7);
    if (net.isIP(mappedIp) === 4) {
      return mappedIp;
    }
  }

  if (net.isIP(trimmed)) {
    return trimmed;
  }

  return null;
}

function calculateBadToGoodRatio(badRouteCount, goodRouteCount) {
  if (badRouteCount <= 0) return 0;
  if (goodRouteCount <= 0) return Number.POSITIVE_INFINITY;
  return badRouteCount / goodRouteCount;
}

function meetsBadToGoodRatioThreshold(badRouteCount, goodRouteCount) {
  return (
    badRouteCount > 0 &&
    (goodRouteCount <= 0 ||
      badRouteCount >= goodRouteCount * TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD)
  );
}

async function getIpRouteTotals(Tracker, ip) {
  if (!ip || ip === "UNKNOWN") {
    return {
      badRouteCountAllTime: 0,
      goodRouteCountAllTime: 0,
    };
  }

  const [totals] = await Tracker.aggregate([
    { $match: { ip } },
    {
      $project: {
        goodRouteValues: { $objectToArray: { $ifNull: ["$goodRoutes", {}] } },
        badRouteValues: { $objectToArray: { $ifNull: ["$badRoutes", {}] } },
      },
    },
    {
      $project: {
        goodRouteCountAllTime: { $sum: "$goodRouteValues.v" },
        badRouteCountAllTime: { $sum: "$badRouteValues.v" },
      },
    },
    {
      $group: {
        _id: null,
        goodRouteCountAllTime: { $sum: "$goodRouteCountAllTime" },
        badRouteCountAllTime: { $sum: "$badRouteCountAllTime" },
      },
    },
  ]);

  return {
    badRouteCountAllTime: totals?.badRouteCountAllTime || 0,
    goodRouteCountAllTime: totals?.goodRouteCountAllTime || 0,
  };
}

function buildAutoBlockPolicy({ badRouteCountAllTime, goodRouteCountAllTime }) {
  if (
    !meetsBadToGoodRatioThreshold(badRouteCountAllTime, goodRouteCountAllTime)
  ) {
    return null;
  }

  const ratio = calculateBadToGoodRatio(
    badRouteCountAllTime,
    goodRouteCountAllTime,
  );
  const ratioText = Number.isFinite(ratio) ? ratio.toFixed(2) : "INF";

  if (badRouteCountAllTime > TRACKER_BLOCK_24H_THRESHOLD) {
    return {
      blockLevel: "permanent",
      isPermanent: true,
      blockedUntil: null,
      rank: 3,
      reason: `Auto blocked: ${badRouteCountAllTime} bad / ${goodRouteCountAllTime} good routes (ratio ${ratioText}, threshold ${TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD})`,
    };
  }

  if (badRouteCountAllTime >= TRACKER_BLOCK_24H_THRESHOLD) {
    return {
      blockLevel: "temporary_24h",
      isPermanent: false,
      blockedUntil: new Date(
        Date.now() + TRACKER_BLOCK_24H_DURATION_HOURS * 60 * 60 * 1000,
      ),
      rank: 2,
      reason: `Auto blocked: ${badRouteCountAllTime} bad / ${goodRouteCountAllTime} good routes (ratio ${ratioText}, threshold ${TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD})`,
    };
  }

  if (badRouteCountAllTime >= TRACKER_BLOCK_30M_THRESHOLD) {
    return {
      blockLevel: "temporary_30m",
      isPermanent: false,
      blockedUntil: new Date(
        Date.now() + TRACKER_BLOCK_30M_DURATION_MINUTES * 60 * 1000,
      ),
      rank: 1,
      reason: `Auto blocked: ${badRouteCountAllTime} bad / ${goodRouteCountAllTime} good routes (ratio ${ratioText}, threshold ${TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD})`,
    };
  }

  return null;
}

function getBlockRank(blockDoc, now = new Date()) {
  if (!blockDoc) return 0;
  if (blockDoc.blockLevel === "manual") return 4;
  if (blockDoc.isPermanent || blockDoc.blockLevel === "permanent") return 3;
  if (!blockDoc.blockedUntil || blockDoc.blockedUntil <= now) return 0;
  if (blockDoc.blockLevel === "temporary_24h") return 2;
  if (blockDoc.blockLevel === "temporary_30m") return 1;
  return 0;
}

function isActiveBlock(blockDoc, now = new Date()) {
  if (!blockDoc) return false;
  if (blockDoc.blockLevel === "manual") return true;
  if (blockDoc.isPermanent || blockDoc.blockLevel === "permanent") return true;
  return Boolean(blockDoc.blockedUntil && blockDoc.blockedUntil > now);
}

function buildActiveBlockQuery(now = new Date()) {
  return {
    $or: [
      { blockLevel: "manual" },
      { blockLevel: "permanent" },
      { isPermanent: true },
      { blockedUntil: { $gt: now } },
    ],
  };
}

async function applyAutoBlockForIp({
  IpBlock,
  TrackerBlockEvent,
  TrackerWeeklyIpSummary,
  TrackerIpBlockLifecycle,
  ip,
  badRouteCountAllTime,
  goodRouteCountAllTime,
}) {
  if (!ip || ip === "UNKNOWN" || isProtectedIp(ip)) {
    return;
  }

  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const now = new Date();
    const policy = buildAutoBlockPolicy({
      badRouteCountAllTime,
      goodRouteCountAllTime,
    });
    if (!policy) return;

    const existing = await IpBlock.findOne({ ip }).lean();
    const existingRank = getBlockRank(existing, now);

    if (existing?.blockLevel === "manual") {
      return;
    }

    if (existingRank >= policy.rank && isActiveBlock(existing, now)) {
      return;
    }

    const update = {
      source: "auto",
      reason: policy.reason,
      blockLevel: policy.blockLevel,
      badRouteCountAtBlock: badRouteCountAllTime,
      blockedAt: now,
      blockedUntil: policy.blockedUntil,
      isPermanent: policy.isPermanent,
    };

    if (!existing) {
      try {
        await IpBlock.create({ ip, ...update });

        await recordBlockTransition({
          TrackerBlockEvent,
          TrackerWeeklyIpSummary,
          TrackerIpBlockLifecycle,
          ip,
          source: "auto",
          badRouteCountAllTime,
          goodRouteCountAllTime,
          blockLevel: policy.blockLevel,
          blockedAt: update.blockedAt,
          blockedUntil: policy.blockedUntil,
          reason: policy.reason,
        });

        return;
      } catch (error) {
        if (error?.code === 11000) {
          continue;
        }
        throw error;
      }
    }

    const result = await IpBlock.updateOne(
      {
        _id: existing._id,
        updatedAt: existing.updatedAt,
        blockLevel: existing.blockLevel,
        isPermanent: Boolean(existing.isPermanent),
        blockedUntil: existing.blockedUntil || null,
      },
      { $set: update },
    );

    if (result.modifiedCount === 1) {
      await recordBlockTransition({
        TrackerBlockEvent,
        TrackerWeeklyIpSummary,
        TrackerIpBlockLifecycle,
        ip,
        source: "auto",
        badRouteCountAllTime,
        goodRouteCountAllTime,
        blockLevel: policy.blockLevel,
        blockedAt: update.blockedAt,
        blockedUntil: policy.blockedUntil,
        reason: policy.reason,
      });

      return;
    }
  }
}

export async function recordRequest(trackerData = {}) {
  const connection = await getTrackerConnection();
  const {
    Tracker,
    TrackerEvent,
    IpBlock,
    TrackerBlockEvent,
    TrackerWeeklyIpSummary,
    TrackerIpBlockLifecycle,
  } = getModels(connection);

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
    environment,
    host,
    isLocalDev,
  } = trackerData;

  const safeIp = ip || "UNKNOWN";
  const safeCountry = country || "UNKNOWN";
  const safeCity = city || "UNKNOWN";
  const safeUserAgent = userAgent || "UNKNOWN";
  const safeRoute = route || "UNKNOWN";
  const safeMethod = method || "UNKNOWN";
  const safeStatusCode = Number.isInteger(statusCode) ? statusCode : 0;
  const safeIsGoodRoute =
    typeof isGoodRoute === "boolean" ? isGoodRoute : false;
  const safeEnvironment = environment || process.env.NODE_ENV || "development";
  const safeHost = host || "UNKNOWN";
  const safeIsLocalDev = Boolean(isLocalDev);
  const safeRouteMapKey = sanitizeRouteKey(safeRoute);

  await TrackerEvent.create({
    ip: safeIp,
    appName,
    country: safeCountry,
    city: safeCity,
    userAgent: safeUserAgent,
    route: safeRoute,
    method: safeMethod,
    statusCode: safeStatusCode,
    isGoodRoute: safeIsGoodRoute,
    environment: safeEnvironment,
    host: safeHost,
    isLocalDev: safeIsLocalDev,
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
      lastEnvironment: safeEnvironment,
      lastHost: safeHost,
      lastIsLocalDev: safeIsLocalDev,
    });
  } else {
    tracker.timesVisited += 1;
    tracker.lastVisitDate = new Date().toLocaleDateString("en-GB");
    tracker.lastVisitTime = new Date().toLocaleTimeString("en-GB", {
      hour12: false,
    });
    tracker.isFirstVisit = false;
    tracker.userAgent = safeUserAgent || tracker.userAgent;
    tracker.lastEnvironment = safeEnvironment;
    tracker.lastHost = safeHost;
    tracker.lastIsLocalDev = safeIsLocalDev;

    if (tracker.ip === "UNKNOWN" && safeIp !== "UNKNOWN") tracker.ip = safeIp;
    if (tracker.country === "UNKNOWN" && safeCountry !== "UNKNOWN") {
      tracker.country = safeCountry;
    }
    if (tracker.city === "UNKNOWN" && safeCity !== "UNKNOWN") {
      tracker.city = safeCity;
    }
  }

  const routeMap = safeIsGoodRoute ? tracker.goodRoutes : tracker.badRoutes;
  const currentRouteCount = routeMap.get(safeRouteMapKey) || 0;
  const isNewRoute = currentRouteCount === 0;
  routeMap.set(safeRouteMapKey, currentRouteCount + 1);

  if (isNewRoute) {
    if (safeIsGoodRoute) {
      tracker.goodRouteCount = (tracker.goodRouteCount || 0) + 1;
    } else {
      tracker.badRouteCount = (tracker.badRouteCount || 0) + 1;
    }
  }

  await tracker.save();

  if (!safeIsGoodRoute) {
    const { badRouteCountAllTime, goodRouteCountAllTime } =
      await getIpRouteTotals(Tracker, safeIp);

    await applyAutoBlockForIp({
      IpBlock,
      TrackerBlockEvent,
      TrackerWeeklyIpSummary,
      TrackerIpBlockLifecycle,
      ip: safeIp,
      badRouteCountAllTime,
      goodRouteCountAllTime,
    });
  }
}

export { decodeRouteKey };

export async function getTrackerSummary({ weekKey } = {}) {
  const connection = await getTrackerConnection();
  const { TrackerWeeklyIpSummary, TrackerIpBlockLifecycle } =
    getModels(connection);
  const devIps = [...getIpDevSet()];

  const currentWeekInfo = getWeekInfoForDate(new Date());
  const requestedWeekInfo = weekKey ? getWeekInfoFromWeekKey(weekKey) : null;
  const selectedWeekInfo = requestedWeekInfo || currentWeekInfo;

  const availableWeekKeysRaw = await TrackerWeeklyIpSummary.distinct("weekKey");
  const allWeekKeys = new Set(
    availableWeekKeysRaw
      .map((key) => getWeekInfoFromWeekKey(key)?.weekKey)
      .filter(Boolean),
  );
  allWeekKeys.add(currentWeekInfo.weekKey);
  allWeekKeys.add(selectedWeekInfo.weekKey);

  const availableWeeks = [...allWeekKeys]
    .map((key) => getWeekInfoFromWeekKey(key))
    .filter(Boolean)
    .sort((a, b) => (a.weekKey < b.weekKey ? 1 : -1))
    .map((info) => ({
      weekKey: info.weekKey,
      weekStartDate: info.weekStartDate,
      weekEndDate: info.weekEndDate,
      label: `${formatIsoDateToDisplay(info.weekStartDate)} - ${formatIsoDateToDisplay(info.weekEndDate)}`,
    }));

  const weeklyTotalsFilter = {
    weekKey: selectedWeekInfo.weekKey,
    ...(devIps.length > 0 ? { ip: { $nin: devIps } } : {}),
  };
  const allTimeTotalsFilter = devIps.length > 0 ? { ip: { $nin: devIps } } : {};

  const weeklyTotals = await getBlockTotals(
    TrackerWeeklyIpSummary,
    weeklyTotalsFilter,
  );
  const allTimeTotals = await getBlockTotals(
    TrackerIpBlockLifecycle,
    allTimeTotalsFilter,
  );

  const weeklyIpSummaries = await TrackerWeeklyIpSummary.find(
    weeklyTotalsFilter,
  )
    .sort({
      hasPermanent: -1,
      has24h: -1,
      has30m: -1,
      blockedPermanentAt: -1,
      blocked24hAt: -1,
      blocked30mAt: -1,
      ip: 1,
    })
    .lean();

  const weeklyIps = weeklyIpSummaries.map((item) => ({
    ip: item.ip,
    blocked30mAt: item.blocked30mAt || null,
    blocked24hAt: item.blocked24hAt || null,
    blockedPermanentAt: item.blockedPermanentAt || null,
    badRouteCountAllTime: item.badRouteCountAllTime || 0,
    goodRouteCountAllTime: item.goodRouteCountAllTime || 0,
    ratioThreshold: item.ratioThreshold || TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD,
  }));

  return {
    timeZone: TRACKER_WEEKLY_SUMMARY_TIMEZONE,
    selectedWeek: {
      weekKey: selectedWeekInfo.weekKey,
      weekStartDate: selectedWeekInfo.weekStartDate,
      weekEndDate: selectedWeekInfo.weekEndDate,
      weekLabelDate: formatIsoDateToDisplay(selectedWeekInfo.weekEndDate),
      weekRangeLabel: `${formatIsoDateToDisplay(selectedWeekInfo.weekStartDate)} - ${formatIsoDateToDisplay(selectedWeekInfo.weekEndDate)}`,
    },
    availableWeeks,
    weeklyTotals,
    allTimeTotals,
    weeklyIps,
  };
}

export async function getBlockedIps() {
  const connection = await getTrackerConnection();
  const { IpBlock } = getModels(connection);
  const protectedIps = getProtectedIpSet();
  const now = new Date();

  const activeIpBlocks = await IpBlock.find(buildActiveBlockQuery(now))
    .select({ ip: 1 })
    .lean();

  return activeIpBlocks
    .map((doc) => (typeof doc.ip === "string" ? doc.ip.trim() : null))
    .filter((ip) => ip && !protectedIps.has(ip));
}

export async function getActiveIpBlocks({ ips } = {}) {
  const connection = await getTrackerConnection();
  const { IpBlock } = getModels(connection);
  const protectedIps = getProtectedIpSet();
  const now = new Date();

  const query = buildActiveBlockQuery(now);
  if (Array.isArray(ips) && ips.length > 0) {
    const sanitizedIps = [...new Set(ips)]
      .filter((ip) => typeof ip === "string")
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0);

    if (sanitizedIps.length > 0) {
      query.ip = { $in: sanitizedIps };
    }
  }

  const activeIpBlocks = await IpBlock.find(query)
    .select({
      ip: 1,
      blockLevel: 1,
      blockedUntil: 1,
      isPermanent: 1,
      source: 1,
    })
    .lean();

  return activeIpBlocks
    .map((doc) => {
      const ip = typeof doc.ip === "string" ? doc.ip.trim() : "";
      if (!ip || protectedIps.has(ip)) return null;

      const blockLevel =
        typeof doc.blockLevel === "string" ? doc.blockLevel : "none";

      return {
        ip,
        blockLevel,
        blockedUntil: doc.blockedUntil || null,
        isPermanent: Boolean(
          doc.isPermanent ||
          blockLevel === "manual" ||
          blockLevel === "permanent",
        ),
        source: doc.source || null,
      };
    })
    .filter(Boolean);
}

export async function blockIpAddress(ip) {
  const safeIp = normalizeAndValidateIp(ip);
  if (!safeIp) return { ok: false, status: "invalid_ip" };
  if (isProtectedIp(safeIp)) return { ok: false, status: "protected" };

  const connection = await getTrackerConnection();
  const { IpBlock } = getModels(connection);

  await IpBlock.findOneAndUpdate(
    { ip: safeIp },
    {
      $set: {
        source: "manual",
        reason: "Manually blocked from tracker admin",
        blockLevel: "manual",
        blockedAt: new Date(),
        blockedUntil: null,
        isPermanent: true,
      },
      $setOnInsert: {
        ip: safeIp,
      },
    },
    {
      upsert: true,
    },
  );

  return { ok: true, status: "blocked" };
}

export async function unblockIpAddress(ip) {
  const safeIp = normalizeAndValidateIp(ip);
  if (!safeIp) return { ok: false, status: "invalid_ip" };

  const connection = await getTrackerConnection();
  const { IpBlock } = getModels(connection);

  const result = await IpBlock.deleteOne({ ip: safeIp });

  if (result.deletedCount === 0) {
    return { ok: false, status: "not_found" };
  }

  return { ok: true, status: "removed" };
}

export async function getFlaggedIps() {
  const connection = await getTrackerConnection();
  const { Tracker, IpBlock } = getModels(connection);
  const protectedIps = getProtectedIpSet();
  const now = new Date();

  const flagged = await Tracker.aggregate([
    {
      $match: {
        ip: { $nin: ["UNKNOWN", ""] },
      },
    },
    {
      $project: {
        ip: 1,
        updatedAt: 1,
        goodRouteValues: { $objectToArray: { $ifNull: ["$goodRoutes", {}] } },
        badRouteValues: { $objectToArray: { $ifNull: ["$badRoutes", {}] } },
      },
    },
    {
      $project: {
        ip: 1,
        lastSeenAt: "$updatedAt",
        goodRouteCountAllTime: { $sum: "$goodRouteValues.v" },
        badRouteCountAllTime: { $sum: "$badRouteValues.v" },
      },
    },
    {
      $group: {
        _id: "$ip",
        goodRouteCountAllTime: { $sum: "$goodRouteCountAllTime" },
        badRouteCountAllTime: { $sum: "$badRouteCountAllTime" },
        lastSeenAt: { $max: "$lastSeenAt" },
      },
    },
    {
      $match: {
        badRouteCountAllTime: { $gte: TRACKER_FLAG_THRESHOLD },
        $expr: {
          $or: [
            {
              $and: [
                { $eq: ["$goodRouteCountAllTime", 0] },
                { $gt: ["$badRouteCountAllTime", 0] },
              ],
            },
            {
              $gte: [
                "$badRouteCountAllTime",
                {
                  $multiply: [
                    "$goodRouteCountAllTime",
                    TRACKER_BAD_TO_GOOD_RATIO_THRESHOLD,
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $sort: {
        badRouteCountAllTime: -1,
        lastSeenAt: -1,
      },
    },
  ]);

  const activeBlocks = await IpBlock.find(buildActiveBlockQuery(now)).lean();
  const activeBlockMap = new Map(
    activeBlocks
      .filter((block) => typeof block.ip === "string" && block.ip.trim())
      .map((block) => [block.ip.trim(), block]),
  );

  return flagged
    .filter(
      (item) =>
        typeof item._id === "string" && !protectedIps.has(item._id.trim()),
    )
    .map((item) => {
      const ip = item._id.trim();
      const activeBlock = activeBlockMap.get(ip);
      const badToGoodRatio = calculateBadToGoodRatio(
        item.badRouteCountAllTime,
        item.goodRouteCountAllTime,
      );

      return {
        ip,
        badRouteCountAllTime: item.badRouteCountAllTime,
        goodRouteCountAllTime: item.goodRouteCountAllTime,
        badToGoodRatio: Number.isFinite(badToGoodRatio)
          ? Number(badToGoodRatio.toFixed(2))
          : null,
        lastSeenAt: item.lastSeenAt,
        isBlocked: Boolean(activeBlock),
        blockLevel: activeBlock?.blockLevel || "none",
        blockedUntil: activeBlock?.blockedUntil || null,
        isPermanent: Boolean(
          activeBlock?.isPermanent || activeBlock?.blockLevel === "manual",
        ),
        source: activeBlock?.source || null,
      };
    });
}
