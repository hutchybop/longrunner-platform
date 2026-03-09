import {
  createPolicyMiddleware,
  createAuthMiddleware,
} from "@longrunner/shared-middleware";
import {
  createPolicySchemas,
  createAuthSchemas,
} from "@longrunner/shared-schemas";
import { reviewSchema } from "../models/schemas.js";
import Review from "../models/review.js";

const { tandcSchema } = createPolicySchemas();
const {
  loginSchema,
  registerSchema,
  forgotSchema,
  resetSchema,
  detailsSchema,
  deleteSchema,
} = createAuthSchemas();

const policyMiddleware = createPolicyMiddleware({
  schemas: { tandcSchema },
});

const authMiddleware = createAuthMiddleware({
  schemas: {
    loginSchema,
    registerSchema,
    forgotSchema,
    resetSchema,
    detailsSchema,
    deleteSchema,
  },
});

export const { validateTandC } = policyMiddleware;
export const {
  validateLogin,
  validateRegister,
  validateForgot,
  validateReset,
  validateDetails,
  validateDelete,
  isLoggedIn,
  populateUser,
} = authMiddleware;

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
  }
  return next();
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
