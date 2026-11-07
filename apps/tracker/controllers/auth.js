import { PasswordUtils } from "@longrunner/shared-auth";
import TrackerUser from "../models/trackerUser.js";
import { loginTrackerUser, logoutTrackerUser } from "../utils/auth.js";

export const login = (req, res) => {
  if (req.trackerUser) {
    return res.redirect("/admin");
  }

  return res.render("auth/login", {
    title: "Tracker Admin Login",
  });
};

export const loginPost = async (req, res) => {
  const username = req.body?.username?.toString().trim();
  const password = req.body?.password?.toString();
  const genericError = "Invalid username or password";

  if (!username || !password) {
    req.flash("error", genericError);
    return res.redirect("/auth/login");
  }

  const trackerUser = await TrackerUser.findOne({ username });
  if (!trackerUser) {
    req.flash("error", genericError);
    return res.redirect("/auth/login");
  }

  const isValidPassword = await PasswordUtils.comparePassword(
    password,
    trackerUser.password,
  );

  if (!isValidPassword) {
    req.flash("error", genericError);
    return res.redirect("/auth/login");
  }

  const redirectUrl = req.session.returnTo || "/admin";
  await loginTrackerUser(req, trackerUser);

  req.flash("success", "Welcome back!");
  return res.redirect(redirectUrl);
};

export const logoutPost = async (req, res) => {
  try {
    await logoutTrackerUser(req);
    return res.redirect("/auth/login");
  } catch {
    req.flash("error", "Logout failed, please try again");
    return res.redirect("/admin");
  }
};
