import rateLimit from "express-rate-limit";
import { ipKeyGenerator } from "express-rate-limit";

const baseConfig = {
  standardHeaders: true,
  legacyHeaders: false,
};

function createLimiter({ windowMs, max, message, redirect, ...extra }) {
  return rateLimit({
    ...baseConfig,
    windowMs,
    max,
    handler: (req, res) => {
      req.flash("error", message);
      return res.redirect(redirect);
    },
    ...extra,
  });
}

const generalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests, please try again later.",
  redirect: "back",
});

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many authentication attempts, please try again later.",
  redirect: "/auth/login",
  skipSuccessfulRequests: true,
});

const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many password reset attempts, please try again later.",
  redirect: "/auth/forgot",
});

const formSubmissionLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many submissions, please wait before trying again.",
  redirect: "back",
  keyGenerator: (req) =>
    req.user ? `user_${req.user._id}` : ipKeyGenerator(req),
});

export {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  formSubmissionLimiter,
};
