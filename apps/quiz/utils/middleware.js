import { createPolicyMiddleware } from "@longrunner/shared-middleware";
import { createPolicySchemas } from "@longrunner/shared-schemas";
import catchAsync from "@longrunner/shared-utils/catchAsync.js";
import {
  lobbyNewSchema,
  lobbyJoinSchema,
  userDataSchema,
} from "../models/schemas.js";

const { tandcSchema } = createPolicySchemas();
const policyMiddleware = createPolicyMiddleware({
  schemas: { tandcSchema },
});

export const { validateTandC } = policyMiddleware;

// Function to send a Flash error instead of re-directing to error page
const JoiFlashError = (error, req, res, next, url) => {
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    // Allows for generic message in production
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
    // throw new ExpressError(msg, 400) // ExpressError will send the user to the error page
    return res.redirect(`${url}`);
  } else {
    return next();
  }
};

export const validateLobbyNew = catchAsync(async (req, res, next) => {
  const { error } = lobbyNewSchema.validate(req.body);
  JoiFlashError(error, req, res, next, "/");
});

export const validateLobbyJoin = catchAsync(async (req, res, next) => {
  const { error } = lobbyJoinSchema.validate(req.body);
  JoiFlashError(error, req, res, next, "/");
});

export const validateUserData = catchAsync(async (req, res, next) => {
  const userData = res.locals.userData;
  // Sends the user back to the previous url or '/' if 'Referer' is not available
  const previousUrl = req.headers.referer || "/";

  if (!userData) {
    return next();
  }

  const { error } = userDataSchema.validate(userData);
  JoiFlashError(error, req, res, next, previousUrl); // need to work for all routes
});
