import mail from "@longrunner/shared-utils/mail.js";
import PasswordUtils from "../utils/passwordUtils.js";
import { loginUser, logoutUser } from "../utils/auth.js";

export function createUsersController(config = {}) {
  const {
    domain = "longrunner.co.uk",
    assetsPrefix = "shared-auth",
    onRegister = async () => {},
    onDelete = async () => {},
    protectedUsername = null,
  } = config;

  return {
    register: (req, res) => {
      res.render("users/register", {
        title: `Register at ${domain}`,
        css_page: `${assetsPrefix}/users`,
        js_page: `${assetsPrefix}/register`,
      });
    },

    registerPost: async (req, res) => {
      if (req.body.tnc && req.body.tnc === "checked") {
        if (req.body.password !== req.body.confirm_password) {
          req.flash("error", "Passwords do not match.");
          return res.redirect("/auth/register");
        }

        const { email, username, password } = req.body;
        const User = req.app.locals.User;
        const user = new User({ username, email });
        const registeredUser = await User.register(user, password);

        await loginUser(req, registeredUser);

        await onRegister(req, registeredUser);

        mail(
          `New User Registered on ${domain}`,
          "Hello,\n\n" +
            "A new User has registered! \n\n" +
            "Username: " +
            username +
            "\n\n" +
            "Email: " +
            email,
        );

        req.flash("success", "You are logged in!");
        res.redirect("/");
      } else {
        req.flash("error", "You must accept the Terms and Conditions.");
        res.redirect("/auth/register");
      }
    },

    login: (req, res) => {
      res.render("users/login", {
        title: `Login to ${domain}`,
        css_page: `${assetsPrefix}/users`,
      });
    },

    loginPost: async (req, res) => {
      req.flash("success", "Welcome back!");
      const redirectUrl = req.session.returnTo || "/";
      delete req.session.returnTo;
      res.redirect(redirectUrl);
    },

    logout: async (req, res) => {
      req.flash("success", "Successfully logged out");
      try {
        await logoutUser(req);
      } catch (err) {
        req.flash("error", "Logout Error: " + err);
      }
      res.redirect("/");
    },

    forgot: (req, res) => {
      res.render("users/forgot", { title: "Password Reset" });
    },

    forgotPost: async (req, res) => {
      const token = PasswordUtils.generateResetToken();
      const User = req.app.locals.User;

      const foundUser = await User.findOne({ email: req.body.email });

      const successMessage =
        "If an account with that email address exists, a password reset link has been sent.";

      if (foundUser) {
        foundUser.resetPasswordToken = token;
        foundUser.resetPasswordExpires =
          PasswordUtils.generateResetTokenExpiry();
        if (foundUser.resetPasswordUsed !== undefined) {
          foundUser.resetPasswordUsed = false;
        }

        await foundUser.save();

        await mail(
          `${domain} Password Reset`,
          "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
            "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
            "http://" +
            req.headers.host +
            "/auth/reset/" +
            token +
            "\n\n" +
            "If you did not request this, please ignore this email and your password will remain unchanged.\n",
          foundUser.email,
        );
      }

      req.flash("success", successMessage);
      res.redirect("/auth/login");
    },

    reset: async (req, res) => {
      const User = req.app.locals.User;
      const query = {
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: new Date() },
      };

      if (User.schema.paths.resetPasswordUsed) {
        query.resetPasswordUsed = { $ne: true };
      }

      const foundUser = await User.findOne(query);

      if (!foundUser) {
        req.flash(
          "error",
          "Password reset token is invalid, has been used, or has expired.",
        );
        return res.redirect("/auth/forgot");
      }

      res.render("users/reset", {
        token: req.params.token,
        title: "Reset Your Password",
      });
    },

    resetPost: async (req, res) => {
      try {
        const User = req.app.locals.User;
        const query = {
          resetPasswordToken: req.params.token,
          resetPasswordExpires: { $gt: new Date() },
        };

        if (User.schema.paths.resetPasswordUsed) {
          query.resetPasswordUsed = { $ne: true };
        }

        const foundUser = await User.findOne(query);

        if (!foundUser) {
          req.flash(
            "error",
            "Password reset token is invalid, has been used, or has expired.",
          );
          return res.redirect("back");
        }

        if (req.body.password !== req.body.confirm_password) {
          req.flash("error", "Passwords do not match.");
          return res.redirect("back");
        }

        foundUser.password = await PasswordUtils.hashPassword(
          req.body.password,
        );
        foundUser.resetPasswordToken = undefined;
        foundUser.resetPasswordExpires = undefined;
        if (foundUser.resetPasswordUsed !== undefined) {
          foundUser.resetPasswordUsed = true;
        }
        foundUser.hash = undefined;
        foundUser.salt = undefined;

        await foundUser.save();
        await loginUser(req, foundUser);

        mail(
          `Your password has been changed for ${domain}`,
          "Hello,\n\n" +
            "This is a confirmation that the password for your account " +
            foundUser.email +
            ` on ${domain} has just been changed.\n`,
          foundUser.email,
        );

        req.flash("success", "Success! Your password has been changed.");
        res.redirect("/");
      } catch (e) {
        req.flash("error", e.message);
        res.redirect("/auth/login");
      }
    },

    details: (req, res) => {
      const username = req.user.username;
      const email = req.user.email;

      res.render("users/details", {
        username,
        email,
        title: "Reset Your Email Adrress",
      });
    },

    detailsPost: async (req, res) => {
      try {
        const { email, username } = req.body;
        const id = req.user._id;
        const User = req.app.locals.User;

        const foundEmail = await User.findOne({ email: req.body.email });
        const foundUsername = await User.findOne({
          username: req.body.username,
        });

        if (foundEmail != null) {
          if (foundEmail.id != id) {
            req.flash("error", "Email already registered");
            return res.redirect("/auth/details");
          }
        }

        if (foundUsername != null) {
          if (foundUsername.id != id) {
            req.flash("error", "Username already taken");
            return res.redirect("/auth/details");
          }
        }

        const auth = await req.user.authenticate(req.body.password);

        if (auth.user !== false) {
          const updatedUser = await User.findByIdAndUpdate(id, {
            $set: {
              username: username,
              email: email,
            },
          });

          const detailsUser = await User.findById(id);

          mail(
            `Details Updated - ${domain}`,
            "Hello,\n\n" +
              `Your details on ${domain} have been changed, your new details are:` +
              "\n\n" +
              `Email: ${detailsUser.email}` +
              "\n\n" +
              `Username: ${detailsUser.username}` +
              "\n\n" +
              "If you did not make these changes please conact hello@longrunner.co.uk",
            detailsUser.email,
          );

          if (detailsUser.email != updatedUser.email) {
            mail(
              `Details Updated - ${domain}`,
              "Hello,\n\n" +
                `Your details on ${domain} have been changed, your new details are:` +
                "\n\n" +
                `Email: ${detailsUser.email}` +
                "\n\n" +
                `Username: ${detailsUser.username}` +
                "\n\n" +
                "If you did not make these changes please conact hello@longrunner.co.uk",
              updatedUser.email,
            );
          }

          req.flash(
            "success",
            "Details updated, please log-in with new details. An email has been sent to confirm your new details",
          );
          res.redirect(307, "/auth/login");
        } else {
          req.flash(
            "error",
            "Password incorrect, no details changed. Please try again",
          );
          res.redirect("/auth/details");
        }
      } catch (e) {
        req.flash("error", e.message);
        res.redirect("/auth/login");
      }
    },

    deletePre: (req, res) => {
      if (protectedUsername && req.user.username === protectedUsername) {
        req.flash("error", req.user.username + " cannot be deleted here");
        res.redirect("/");
      } else {
        const user = req.user;
        res.render("users/deletepre", {
          user,
          title: "Confirm DELETE account",
        });
      }
    },

    deleteUser: async (req, res) => {
      const auth = await req.user.authenticate(req.body.password);
      const User = req.app.locals.User;

      if (protectedUsername && req.user.username === protectedUsername) {
        req.flash("error", req.user.username + " cannot be deleted here");
        res.redirect("/auth/deletepre");
      } else if (auth.user !== false) {
        const userEmail = req.user.email;
        const userId = req.user._id;

        await onDelete(userId);
        await User.findByIdAndDelete(userId);

        req.session.destroy((err) => {
          if (err) {
            console.error("Session destroy error:", err);
          }
        });

        const message = encodeURIComponent(
          `Succesfully deleted Account for '${userEmail}'`,
        );
        res.redirect(`/?success=${message}`);

        mail(
          `Account deleted on ${domain}`,
          "Hello,\n\n" + "This is confirm that your account has been deleted",
          userEmail,
        );
      } else {
        req.flash("error", "Incorrect password, please try again");
        res.redirect("/auth/deletepre");
      }
    },
  };
}

export default createUsersController;
