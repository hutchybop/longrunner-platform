const authenticateUser = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const User = req.app.locals.User;
    const user = await User.findOne({ username });

    const genericError = "Invalid username or password";

    if (!user) {
      req.flash("error", genericError);
      return res.redirect("/auth/login");
    }

    const auth = await user.authenticate(password);
    if (auth.user) {
      req.user = auth.user;
      return next();
    } else {
      req.flash("error", genericError);
      return res.redirect("/auth/login");
    }
  } catch (error) {
    console.error("Authentication error:", error);
    if (process.env.NODE_ENV === "development") {
      req.flash("error", `Authentication failed: ${error.message}`);
    } else {
      req.flash("error", "Authentication failed");
    }
    return res.redirect("/auth/login");
  }
};

const loginUser = async (req, user) => {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user._id;
      req.user = user;
      resolve();
    });
  });
};

const logoutUser = async (req) => {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

export { authenticateUser, loginUser, logoutUser };
