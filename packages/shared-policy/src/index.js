import mail from "@longrunner/shared-utils/mail.js";
import crypto from "node:crypto";
import { URLSearchParams } from "node:url";
import { mongoose } from "mongoose";

const CONTACT_FORM_SESSION_KEY = "policyContactFormIssuedAt";
const CONTACT_HONEYPOT_FIELD = "website";
const DEFAULT_MIN_SUBMIT_MS = 4000;
const DEFAULT_MAX_SUBMIT_MS = 1000 * 60 * 60 * 2;
const DEFAULT_DEDUPE_WINDOW_MINUTES = 60 * 24;
const DEFAULT_DEDUPE_RETENTION_HOURS = 24 * 7;
const DEFAULT_CONTACT_EVENT_RETENTION_DAYS = 90;

let contactIndexesInitialized = false;
let contactEventIndexesInitialized = false;

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getAllowedTurnstileHostnames() {
  return String(process.env.TURNSTILE_ALLOWED_HOSTNAMES || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function shouldSkipHostMatch(hostname) {
  const normalized = String(hostname || "").toLowerCase();
  return (
    !normalized ||
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0"
  );
}

function isHostnameValid(verifiedHostname, requestHostname) {
  const verified = String(verifiedHostname || "").toLowerCase();
  if (!verified) {
    return false;
  }

  const allowList = getAllowedTurnstileHostnames();
  if (allowList.length > 0) {
    return allowList.includes(verified);
  }

  if (shouldSkipHostMatch(requestHostname)) {
    return true;
  }

  return verified === String(requestHostname || "").toLowerCase();
}

async function verifyTurnstileToken(token, remoteip) {
  if (!process.env.TURNSTILE_SECRET_KEY || !token) {
    return { success: false };
  }

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token,
  });

  if (remoteip) {
    body.append("remoteip", remoteip);
  }

  try {
    const response = await globalThis.fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );

    if (!response.ok) {
      return { success: false };
    }

    const data = await response.json();
    return data;
  } catch {
    return { success: false };
  }
}

async function getContactSubmissionCollection() {
  if (!mongoose.connection?.db) {
    return null;
  }

  const collection = mongoose.connection.collection(
    "policy_contact_submissions",
  );

  if (!contactIndexesInitialized) {
    await collection.createIndex({ dedupeKey: 1, createdAt: -1 });
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    contactIndexesInitialized = true;
  }

  return collection;
}

async function getContactEventCollection() {
  if (!mongoose.connection?.db) {
    return null;
  }

  const collection = mongoose.connection.collection("policy_contact_events");

  if (!contactEventIndexesInitialized) {
    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ appName: 1, createdAt: -1 });
    await collection.createIndex({ outcome: 1, reason: 1, createdAt: -1 });
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    contactEventIndexesInitialized = true;
  }

  return collection;
}

function inferAppNameFromDomain(domain) {
  const normalized = String(domain || "").toLowerCase();
  if (normalized.startsWith("blog.")) return "blog";
  if (normalized.startsWith("quiz.")) return "quiz";
  if (normalized.startsWith("slapp.")) return "slapp";
  if (normalized === "longrunner.co.uk") return "landing";
  return normalized.split(".")[0] || "unknown";
}

async function recordContactEvent(
  req,
  { appName, domain, outcome, reason, details = {} },
) {
  try {
    const collection = await getContactEventCollection();
    if (!collection) {
      return;
    }

    const now = Date.now();
    const retentionDays = toPositiveNumber(
      process.env.CONTACT_EVENT_RETENTION_DAYS,
      DEFAULT_CONTACT_EVENT_RETENTION_DAYS,
    );
    const expiresAt = new Date(now + retentionDays * 24 * 60 * 60 * 1000);

    const emailHash = hashValue(normalizeValue(req.body?.email));
    const messageHash = hashValue(normalizeValue(req.body?.message));

    await collection.insertOne({
      appName,
      domain,
      outcome,
      reason,
      createdAt: new Date(now),
      expiresAt,
      ip: req.ip || "UNKNOWN",
      host: req.get("Host") || "UNKNOWN",
      userAgent: req.get("User-Agent") || "UNKNOWN",
      emailHash,
      messageHash,
      details,
    });
  } catch {
    // Keep contact flow resilient even if logging fails
  }
}

async function isDuplicateSubmission({ domain, email, message }) {
  const collection = await getContactSubmissionCollection();
  if (!collection) {
    return false;
  }

  const normalizedEmail = normalizeValue(email);
  const normalizedMessage = normalizeValue(message);
  const dedupeKey = hashValue(
    `${domain}|${normalizedEmail}|${normalizedMessage}`,
  );

  const dedupeWindowMinutes = toPositiveNumber(
    process.env.CONTACT_DEDUPE_WINDOW_MINUTES,
    DEFAULT_DEDUPE_WINDOW_MINUTES,
  );
  const dedupeRetentionHours = toPositiveNumber(
    process.env.CONTACT_DEDUPE_RETENTION_HOURS,
    DEFAULT_DEDUPE_RETENTION_HOURS,
  );

  const now = Date.now();
  const windowStart = new Date(now - dedupeWindowMinutes * 60 * 1000);
  const expiresAt = new Date(now + dedupeRetentionHours * 60 * 60 * 1000);

  const existing = await collection.findOne({
    dedupeKey,
    createdAt: { $gte: windowStart },
  });

  if (existing) {
    return true;
  }

  await collection.insertOne({
    dedupeKey,
    domain,
    createdAt: new Date(now),
    expiresAt,
  });

  return false;
}

export function createPolicyController(config = {}) {
  const {
    domain = "longrunner.co.uk",
    tandcTitle = `${domain} Information Page`,
    assetsPrefix = "shared-policy",
    policyContent = {},
  } = config;

  const defaultPolicyContent = {
    intro: `Welcome to ${domain}. By accessing and using our website, you agree to comply with and be bound by these Terms and Conditions. Please read them carefully.`,
    aboutWebsite:
      "This website provides user account functionality and app-specific features. Please use it responsibly and in accordance with these terms.",
    appropriateUse:
      "Use the website responsibly and respect other users. You agree not to engage in any behavior that disrupts the experience for others or compromises the security and integrity of the website.",
    contentDisclaimerPrimary:
      "Content is provided for informational purposes only. We make no warranties or representations regarding accuracy, completeness, or suitability.",
    contentDisclaimerSecondary:
      "You are responsible for how you use information and features provided on this website.",
    intellectualProperty: `The content, design, and code of ${domain} are owned by the website creator. You may not reproduce, distribute, or use any part of the website or its content without prior written consent.`,
    limitationOfLiability: `${domain} is provided on an "as is" basis. We make no warranties or representations, express or implied, regarding the website's availability, functionality, or accuracy of content. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the website. Additionally, the website may be taken down or modified at any time without prior notice, and you should not rely on its continued availability.`,
    cookieName: "session",
    cookiePurpose:
      "This cookie keeps the user logged in and maintains their session across different pages.",
  };

  const resolvedPolicyContent = {
    ...defaultPolicyContent,
    ...policyContent,
  };
  const appName = inferAppNameFromDomain(domain);

  return {
    cookiePolicy: (req, res) => {
      res.render("policy/cookiePolicy", {
        title: "cookiePolicy",
        css_page: `${assetsPrefix}/cookiePolicy`,
        domain,
        policyContent: resolvedPolicyContent,
      });
    },

    tandc: (req, res) => {
      req.session[CONTACT_FORM_SESSION_KEY] = Date.now();
      res.render("policy/tandc", {
        title: tandcTitle,
        js_page: `${assetsPrefix}/tandc`,
        css_page: `${assetsPrefix}/tandc`,
        domain,
        policyContent: resolvedPolicyContent,
        turnstileSiteKey: process.env.TURNSTILE_SITE_KEY,
        contactHoneypotField: CONTACT_HONEYPOT_FIELD,
      });
    },

    tandcPost: async (req, res) => {
      const honeypotValue = String(
        req.body?.[CONTACT_HONEYPOT_FIELD] || "",
      ).trim();
      if (honeypotValue) {
        await recordContactEvent(req, {
          appName,
          domain,
          outcome: "blocked",
          reason: "honeypot",
        });
        req.flash("error", "Unable to send message, please try again.");
        return res.redirect("/policy/tandc");
      }

      const minSubmitMs = toPositiveNumber(
        process.env.CONTACT_MIN_SUBMIT_MS,
        DEFAULT_MIN_SUBMIT_MS,
      );
      const maxSubmitMs = toPositiveNumber(
        process.env.CONTACT_MAX_SUBMIT_MS,
        DEFAULT_MAX_SUBMIT_MS,
      );
      const renderedAt = Number(req.session?.[CONTACT_FORM_SESSION_KEY]);
      if (req.session) {
        delete req.session[CONTACT_FORM_SESSION_KEY];
      }

      const submitAge = Date.now() - renderedAt;
      const invalidSubmitWindow =
        !Number.isFinite(renderedAt) ||
        submitAge < minSubmitMs ||
        submitAge > maxSubmitMs;

      if (invalidSubmitWindow) {
        await recordContactEvent(req, {
          appName,
          domain,
          outcome: "blocked",
          reason: "submit_time",
          details: { submitAge, minSubmitMs, maxSubmitMs },
        });
        req.flash("error", "Unable to send message, please try again.");
        return res.redirect("/policy/tandc");
      }

      const turnstileToken = req.body?.["cf-turnstile-response"];
      const turnstileResult = await verifyTurnstileToken(
        turnstileToken,
        req.ip,
      );
      if (!turnstileResult.success) {
        await recordContactEvent(req, {
          appName,
          domain,
          outcome: "blocked",
          reason: "turnstile_fail",
          details: {
            errorCodes: Array.isArray(turnstileResult["error-codes"])
              ? turnstileResult["error-codes"]
              : [],
          },
        });
        req.flash("error", "Captcha validation failed, please try again.");
        return res.redirect("/policy/tandc");
      }

      if (!isHostnameValid(turnstileResult.hostname, req.hostname)) {
        await recordContactEvent(req, {
          appName,
          domain,
          outcome: "blocked",
          reason: "turnstile_hostname",
          details: {
            verifiedHostname: turnstileResult.hostname || null,
            requestHostname: req.hostname || null,
          },
        });
        req.flash("error", "Captcha validation failed, please try again.");
        return res.redirect("/policy/tandc");
      }

      const duplicate = await isDuplicateSubmission({
        domain,
        email: req.body.email,
        message: req.body.message,
      });

      if (duplicate) {
        await recordContactEvent(req, {
          appName,
          domain,
          outcome: "blocked",
          reason: "duplicate",
        });
        req.flash(
          "error",
          "Duplicate message detected. Please try again later.",
        );
        return res.redirect("/policy/tandc");
      }

      await mail(
        `Contact Form Submitted - ${domain}`,
        "Hello,\n\n" +
          `Your message to ${domain} has been submittted. The details are below` +
          "\n\n" +
          `Name: ${req.body.name}` +
          "\n\n" +
          `Email: ${req.body.email}` +
          "\n\n" +
          `Message: ${req.body.message}`,
        req.body.email,
      );

      await mail(
        `Contact Form Submitted - ${domain}`,
        "Hello,\n\n" +
          "A new message has been submitted" +
          "\n\n" +
          `Name: ${req.body.name}` +
          "\n\n" +
          `Email: ${req.body.email}` +
          "\n\n" +
          `Body: ${req.body.message}`,
      );

      await recordContactEvent(req, {
        appName,
        domain,
        outcome: "sent",
        reason: "accepted",
      });

      req.flash("success", "Message sent.");
      return res.redirect("/policy/tandc");
    },
  };
}

export default createPolicyController;
