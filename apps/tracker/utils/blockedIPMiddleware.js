import BlockedIP from "../models/blockedIP.js";

let blockedIPCache = new Set();
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000;

const updateBlockedIPCache = async () => {
  try {
    const blocked = await BlockedIP.find();
    blockedIPCache = new Set();

    blocked.forEach((blockedDoc) => {
      if (
        blockedDoc.blockedIPArray &&
        Array.isArray(blockedDoc.blockedIPArray)
      ) {
        blockedDoc.blockedIPArray.forEach((ip) => {
          if (ip && typeof ip === "string") {
            blockedIPCache.add(ip.trim());
          }
        });
      }
    });

    lastCacheUpdate = Date.now();
    console.log(`Updated blocked IP cache with ${blockedIPCache.size} IPs`);
  } catch (error) {
    console.error("Error updating blocked IP cache:", error);
  }
};

const checkBlockedIP = async (req, res, next) => {
  try {
    if (Date.now() - lastCacheUpdate > CACHE_TTL) {
      await updateBlockedIPCache();
    }

    let ip =
      req.ipInfo?.ip || req.ip || req.ips || req.connection?.remoteAddress;

    if (ip && ip.includes("::ffff:")) {
      ip = ip.replace("::ffff:", "");
    }

    if (ip && blockedIPCache.has(ip)) {
      console.log(`Blocked IP attempted access: ${ip} to ${req.path}`);
      return res.status(403).json({
        error: "Access Denied",
        message: "Your IP address has been blocked due to suspicious activity.",
      });
    }

    next();
  } catch (error) {
    console.error("Error in blocked IP middleware:", error);
    next();
  }
};

const blockIP = async (ip) => {
  try {
    if (!ip || typeof ip !== "string") {
      throw new Error("Invalid IP address");
    }

    ip = ip.trim();

    let blocked = await BlockedIP.find();

    if (blocked.length > 0) {
      if (!blocked[0].blockedIPArray.includes(ip)) {
        blocked[0].blockedIPArray.push(ip);
        blocked[0].markModified("blockedIPArray");
        await blocked[0].save();
      }
    } else {
      await new BlockedIP({ blockedIPArray: [ip] }).save();
    }

    await updateBlockedIPCache();

    return true;
  } catch (error) {
    console.error("Error blocking IP:", error);
    return false;
  }
};

const unblockIP = async (ip) => {
  try {
    if (!ip || typeof ip !== "string") {
      throw new Error("Invalid IP address");
    }

    ip = ip.trim();

    const blocked = await BlockedIP.find();

    if (blocked.length > 0) {
      const index = blocked[0].blockedIPArray.indexOf(ip);
      if (index > -1) {
        blocked[0].blockedIPArray.splice(index, 1);
        blocked[0].markModified("blockedIPArray");
        await blocked[0].save();

        await updateBlockedIPCache();

        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error unblocking IP:", error);
    return false;
  }
};

const getBlockedIPs = async () => {
  try {
    const blocked = await BlockedIP.find();
    const allBlockedIPs = [];

    blocked.forEach((blockedDoc) => {
      if (
        blockedDoc.blockedIPArray &&
        Array.isArray(blockedDoc.blockedIPArray)
      ) {
        allBlockedIPs.push(...blockedDoc.blockedIPArray);
      }
    });

    return allBlockedIPs;
  } catch (error) {
    console.error("Error getting blocked IPs:", error);
    return [];
  }
};

updateBlockedIPCache();

export {
  checkBlockedIP,
  blockIP,
  unblockIP,
  getBlockedIPs,
  updateBlockedIPCache,
};
