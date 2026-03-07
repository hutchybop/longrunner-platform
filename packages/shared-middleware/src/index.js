import catchAsync from "../../shared-utils/src/catchAsync.js";

export function createMiddleware(config = {}) {
  const {
    schemas = {},
    userModelPath = "../models/user.js"
  } = config;

  const {
    tandcSchema,
    loginSchema,
    registerSchema,
    forgotSchema,
    resetSchema,
    detailsSchema,
    deleteSchema
  } = schemas;

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

  const middleware = {};

  if (tandcSchema) {
    middleware.validateTandC = catchAsync(async (req, res, next) => {
      const { error } = tandcSchema.validate(req.body);
      JoiFlashError(error, req, res, next, "/policy/tandc");
    });
  }

  if (loginSchema) {
    middleware.validateLogin = (req, res, next) => {
      const { error } = loginSchema.validate(req.body);
      JoiFlashError(error, req, res, next, "/auth/login");
    };
  }

  if (registerSchema) {
    middleware.validateRegister = (req, res, next) => {
      const { error } = registerSchema.validate(req.body);
      JoiFlashError(error, req, res, next, "/auth/register");
    };
  }

  if (forgotSchema) {
    middleware.validateForgot = (req, res, next) => {
      const { error } = forgotSchema.validate(req.body);
      JoiFlashError(error, req, res, next, "/auth/forgot");
    };
  }

  if (resetSchema) {
    middleware.validateReset = (req, res, next) => {
      const { error } = resetSchema.validate(req.body);
      JoiFlashError(error, req, res, next, `/auth/reset/${req.params.token}`);
    };
  }

  if (detailsSchema) {
    middleware.validateDetails = (req, res, next) => {
      const { error } = detailsSchema.validate(req.body);
      JoiFlashError(error, req, res, next, "/auth/details");
    };
  }

  if (deleteSchema) {
    middleware.validateDelete = (req, res, next) => {
      const { error } = deleteSchema.validate(req.body);
      JoiFlashError(error, req, res, next, "/auth/details");
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

export default createMiddleware;
