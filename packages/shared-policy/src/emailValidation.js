import { promises as fs } from "node:fs";
import path from "node:path";
import { resolve4, resolve6, resolveMx } from "node:dns/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as MailcheckModule from "mailcheck";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const DEFAULT_SUPPRESSION_FILE = path.resolve(
  __dirname,
  "..",
  "config",
  "suppressed-emails.txt",
);
const DEFAULT_DNS_TIMEOUT_MS = 2500;

const DNS_TEMPORARY_ERROR_CODES = new Set([
  "EAI_AGAIN",
  "ETIMEOUT",
  "SERVFAIL",
  "REFUSED",
  "ENOTIMP",
]);

const DNS_NOT_FOUND_CODES = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN"]);

const suppressionCache = {
  filePath: "",
  mtimeMs: -1,
  emailSet: new Set(),
  domainSet: new Set(),
};

const mailcheck = MailcheckModule.default || MailcheckModule;

function extractDisposableDomains(moduleValue) {
  const candidates = [
    moduleValue?.default,
    moduleValue?.domains,
    moduleValue?.list,
    moduleValue,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .filter((value) => typeof value === "string")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
    }
  }

  return [];
}

const disposableDomainSet = new Set(
  extractDisposableDomains(require("disposable-email-domains")),
);

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function getDomainFromEmail(email) {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return "";
  }

  return normalized.slice(atIndex + 1);
}

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function withTimeout(promise, timeoutMs) {
  let timer = null;

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = globalThis.setTimeout(() => {
        const timeoutError = new Error("DNS lookup timed out");
        timeoutError.code = "ETIMEOUT";
        reject(timeoutError);
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timer) {
      globalThis.clearTimeout(timer);
    }
  });
}

function parseSuppressionLines(fileContent) {
  const emailSet = new Set();
  const domainSet = new Set();

  const lines = String(fileContent || "").split(/\r?\n/);
  for (const line of lines) {
    const value = line.trim().toLowerCase();
    if (!value || value.startsWith("#")) {
      continue;
    }

    if (value.startsWith("@") && value.length > 1) {
      domainSet.add(value.slice(1));
      continue;
    }

    emailSet.add(value);
  }

  return { emailSet, domainSet };
}

async function loadSuppressionList(filePath) {
  try {
    const stat = await fs.stat(filePath);
    if (
      suppressionCache.filePath === filePath &&
      suppressionCache.mtimeMs === stat.mtimeMs
    ) {
      return suppressionCache;
    }

    const content = await fs.readFile(filePath, "utf8");
    const parsed = parseSuppressionLines(content);

    suppressionCache.filePath = filePath;
    suppressionCache.mtimeMs = stat.mtimeMs;
    suppressionCache.emailSet = parsed.emailSet;
    suppressionCache.domainSet = parsed.domainSet;

    return suppressionCache;
  } catch {
    suppressionCache.filePath = filePath;
    suppressionCache.mtimeMs = -1;
    suppressionCache.emailSet = new Set();
    suppressionCache.domainSet = new Set();
    return suppressionCache;
  }
}

function getSuppressionFilePath() {
  const configuredPath = String(
    process.env.CONTACT_SUPPRESSION_FILE || "",
  ).trim();
  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  return DEFAULT_SUPPRESSION_FILE;
}

async function findSuppressionMatch(email) {
  const normalizedEmail = normalizeEmail(email);
  const domain = getDomainFromEmail(normalizedEmail);
  const list = await loadSuppressionList(getSuppressionFilePath());

  if (list.emailSet.has(normalizedEmail)) {
    return { type: "email", value: normalizedEmail };
  }

  if (domain && list.domainSet.has(domain)) {
    return { type: "domain", value: domain };
  }

  return null;
}

function findTypoSuggestion(email) {
  if (!mailcheck || typeof mailcheck.run !== "function") {
    return null;
  }

  let suggestedEmail = null;
  mailcheck.run({
    email,
    suggested(suggestion) {
      if (suggestion?.full && typeof suggestion.full === "string") {
        suggestedEmail = suggestion.full.toLowerCase();
      }
    },
    empty() {
      suggestedEmail = null;
    },
  });

  const normalized = normalizeEmail(email);
  if (!suggestedEmail || suggestedEmail === normalized) {
    return null;
  }

  return suggestedEmail;
}

function classifyDnsError(error) {
  const code = String(error?.code || "").toUpperCase();
  if (DNS_TEMPORARY_ERROR_CODES.has(code)) {
    return "temporary";
  }

  if (DNS_NOT_FOUND_CODES.has(code)) {
    return "missing";
  }

  return "unknown";
}

async function hasValidMxOrARecord(domain) {
  const timeoutMs = toPositiveNumber(
    process.env.CONTACT_DNS_TIMEOUT_MS,
    DEFAULT_DNS_TIMEOUT_MS,
  );

  try {
    const mxRecords = await withTimeout(resolveMx(domain), timeoutMs);
    if (Array.isArray(mxRecords) && mxRecords.length > 0) {
      return { valid: true, source: "mx" };
    }
  } catch (mxError) {
    const mxErrorType = classifyDnsError(mxError);
    if (mxErrorType === "temporary") {
      return {
        valid: false,
        reason: "temporary",
        errorCode: mxError?.code || null,
      };
    }
  }

  try {
    const [aRecords, aaaaRecords] = await Promise.allSettled([
      withTimeout(resolve4(domain), timeoutMs),
      withTimeout(resolve6(domain), timeoutMs),
    ]);

    const hasA =
      aRecords.status === "fulfilled" &&
      Array.isArray(aRecords.value) &&
      aRecords.value.length > 0;
    const hasAAAA =
      aaaaRecords.status === "fulfilled" &&
      Array.isArray(aaaaRecords.value) &&
      aaaaRecords.value.length > 0;

    if (hasA || hasAAAA) {
      return { valid: true, source: hasA ? "a" : "aaaa" };
    }

    const firstRejected = [aRecords, aaaaRecords].find(
      (result) => result.status === "rejected",
    );

    const errorType = classifyDnsError(firstRejected?.reason);
    if (errorType === "temporary") {
      return {
        valid: false,
        reason: "temporary",
        errorCode: firstRejected?.reason?.code || null,
      };
    }

    return { valid: false, reason: "missing", errorCode: null };
  } catch (error) {
    const errorType = classifyDnsError(error);
    if (errorType === "temporary") {
      return {
        valid: false,
        reason: "temporary",
        errorCode: error?.code || null,
      };
    }

    return { valid: false, reason: "missing", errorCode: error?.code || null };
  }
}

export async function validateContactEmailAddress(email) {
  const normalizedEmail = normalizeEmail(email);
  const domain = getDomainFromEmail(normalizedEmail);

  if (!normalizedEmail || !domain) {
    return {
      ok: false,
      reason: "email_invalid",
      message: "Please provide a valid email address.",
      details: { domain: domain || null },
    };
  }

  const suppressionMatch = await findSuppressionMatch(normalizedEmail);
  if (suppressionMatch) {
    return {
      ok: false,
      reason: "email_suppressed",
      message:
        "This email address cannot be used for contact requests. Please use a different email.",
      details: suppressionMatch,
    };
  }

  if (disposableDomainSet.has(domain)) {
    return {
      ok: false,
      reason: "email_disposable",
      message:
        "Temporary/disposable email addresses are not allowed. Please use your regular email address.",
      details: { domain },
    };
  }

  const suggestion = findTypoSuggestion(normalizedEmail);
  if (suggestion) {
    return {
      ok: false,
      reason: "email_typo_suspected",
      message: `Did you mean ${suggestion}? Please correct your email address and try again.`,
      details: { domain, suggestion },
    };
  }

  const dnsResult = await hasValidMxOrARecord(domain);
  if (!dnsResult.valid) {
    if (dnsResult.reason === "temporary") {
      return {
        ok: false,
        reason: "email_dns_temp_error",
        message:
          "We could not validate your email domain right now. Please try again shortly.",
        details: { domain, errorCode: dnsResult.errorCode || null },
      };
    }

    return {
      ok: false,
      reason: "email_mx_invalid",
      message:
        "This email domain does not appear to accept mail. Please check your email address and try again.",
      details: { domain, errorCode: dnsResult.errorCode || null },
    };
  }

  return {
    ok: true,
    reason: "email_valid",
    details: { domain, dnsSource: dnsResult.source || null },
  };
}
