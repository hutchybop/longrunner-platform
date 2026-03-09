import catchAsync from "@longrunner/shared-utils/catchAsync.js";

const JoiFlashError = (error, req, res, next, url) => {
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    if (process.env.NODE_ENV !== "production") {
      req.flash("error", `${msg}`);
    } else if (msg.includes("must not include HTML!")) {
      req.flash("error", "No HTML allowed, this includes, &, <, > ...");
    } else {
      req.flash(
        "error",
        "There has been a validation error, please try again.",
      );
    }
    return res.redirect(`${url}`);
  } else {
    return next();
  }
};

export function createPolicyMiddleware(config = {}) {
  const { schemas = {}, routePaths = {} } = config;
  const { tandcSchema } = schemas;
  const { tandc = "/policy/tandc" } = routePaths;

  const middleware = {};

  if (tandcSchema) {
    middleware.validateTandC = catchAsync(async (req, res, next) => {
      const { error } = tandcSchema.validate(req.body);
      JoiFlashError(error, req, res, next, tandc);
    });
  }

  return middleware;
}

export function createAuthMiddleware(config = {}) {
  const { schemas = {}, routePaths = {} } = config;

  const {
    loginSchema,
    registerSchema,
    forgotSchema,
    resetSchema,
    detailsSchema,
    deleteSchema,
  } = schemas;

  const {
    login = "/auth/login",
    register = "/auth/register",
    forgot = "/auth/forgot",
    reset = (req) => `/auth/reset/${req.params.token}`,
    details = "/auth/details",
    deletePath = "/auth/details",
  } = routePaths;

  const middleware = {};

  if (loginSchema) {
    middleware.validateLogin = (req, res, next) => {
      const { error } = loginSchema.validate(req.body);
      JoiFlashError(error, req, res, next, login);
    };
  }

  if (registerSchema) {
    middleware.validateRegister = (req, res, next) => {
      const { error } = registerSchema.validate(req.body);
      JoiFlashError(error, req, res, next, register);
    };
  }

  if (forgotSchema) {
    middleware.validateForgot = (req, res, next) => {
      const { error } = forgotSchema.validate(req.body);
      JoiFlashError(error, req, res, next, forgot);
    };
  }

  if (resetSchema) {
    middleware.validateReset = (req, res, next) => {
      const { error } = resetSchema.validate(req.body);
      const resetPath = typeof reset === "function" ? reset(req) : reset;
      JoiFlashError(error, req, res, next, resetPath);
    };
  }

  if (detailsSchema) {
    middleware.validateDetails = (req, res, next) => {
      const { error } = detailsSchema.validate(req.body);
      JoiFlashError(error, req, res, next, details);
    };
  }

  if (deleteSchema) {
    middleware.validateDelete = (req, res, next) => {
      const { error } = deleteSchema.validate(req.body);
      JoiFlashError(error, req, res, next, deletePath);
    };
  }

  middleware.isLoggedIn = (req, res, next) => {
    if (
      !req.user ||
      !req.session.userId ||
      !req.user._id.equals(req.session.userId)
    ) {
      req.session.returnTo = req.originalUrl;
      req.flash("error", "You must be signed in");
      return res.redirect("/auth/login");
    }
    next();
  };

  middleware.populateUser = async (req, res, next) => {
    if (req.session && req.session.userId) {
      const User = req.app.locals.User;
      if (!User) {
        return next();
      }
      await User.findById(req.session.userId)
        .then((user) => {
          if (!user) {
            delete req.session.userId;
            req.user = null;
          } else {
            req.user = user;
          }
          next();
        })
        .catch((err) => next(err));
    } else {
      next();
    }
  };

  return middleware;
}

export default {
  createPolicyMiddleware,
  createAuthMiddleware,
};
