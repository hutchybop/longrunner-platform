import User from "../models/user.js";
import catchAsync from "./catchAsync.js";
import {
  tandcSchema,
  loginSchema,
  registerSchema,
  forgotSchema,
  resetSchema,
  detailsSchema,
  deleteSchema,
  reviewSchema,
} from "../models/schemas.js";
import Review from "../models/review.js";

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

export const validateTandC = catchAsync(async (req, res, next) => {
  const { error } = tandcSchema.validate(req.body);
  JoiFlashError(error, req, res, next, "/policy/tandc");
});

export const validateLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  JoiFlashError(error, req, res, next, "/auth/login");
};

export const validateRegister = (req, res, next) => {
  const { error } = registerSchema.validate(req.body);
  JoiFlashError(error, req, res, next, "/auth/register");
};

export const validateForgot = (req, res, next) => {
  const { error } = forgotSchema.validate(req.body);
  JoiFlashError(error, req, res, next, "/auth/forgot");
};

export const validateReset = (req, res, next) => {
  const { error } = resetSchema.validate(req.body);
  JoiFlashError(error, req, res, next, `/auth/reset/${req.params.token}`);
};

export const validateDetails = (req, res, next) => {
  const { error } = detailsSchema.validate(req.body);
  JoiFlashError(error, req, res, next, "/auth/details");
};

export const validateDelete = (req, res, next) => {
  const { error } = deleteSchema.validate(req.body);
  JoiFlashError(error, req, res, next, "/auth/details");
};

export const isLoggedIn = (req, res, next) => {
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

export const populateUser = async (req, res, next) => {
  if (req.session && req.session.userId) {
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

export const validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  JoiFlashError(error, req, res, next, "/");
};

export const isAdmin = (req, res, next) => {
  const user = req.user;
  if (!user || user.role !== "admin") {
    req.flash("error", "You do not have permission to do that");
    return res.redirect("/");
  }
  next();
};

export const isReviewAuthor = async (req, res, next) => {
  const { id, reviewId } = req.params;
  const review = await Review.findById(reviewId);
  if (!review.author.equals(req.user._id)) {
    req.flash("error", "You do not have permission to do that");
    return res.redirect(`/blogim/${id}`);
  }
  next();
};
