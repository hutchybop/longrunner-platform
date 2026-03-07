import catchAsync from "./catchAsync.js";
import {
  tandcSchema,
  loginSchema,
  registerSchema,
  forgotSchema,
  resetSchema,
  detailsSchema,
  deleteSchema,
  mealSchema,
  ingredientSchema,
  defaultSchema,
  shoppingListMealsSchema,
  categorySchema,
  shoppingListIngredientsSchema,
} from "../models/schemas.js";
import { Meal } from "../models/meal.js";
import { Ingredient } from "../models/ingredient.js";
import { ShoppingList } from "../models/shoppingList.js";

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
  JoiFlashError(error, req, res, next, "/auth/forgot");
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

export const validateMeal = catchAsync(async (req, res, next) => {
  const { error } = mealSchema.validate(req.body);
  JoiFlashError(error, req, res, next, "/meals");
});

export const validateIngredient = catchAsync(async (req, res, next) => {
  const { error } = ingredientSchema.validate(req.body);
  JoiFlashError(error, req, res, next, "/ingredients");
});

export const validatedefault = catchAsync(async (req, res, next) => {
  const { error } = defaultSchema.validate(req.body);
  JoiFlashError(error, req, res, next, "/shoppinglist/default");
});

export const validateshoppingListMeals = catchAsync(
  async (req, res, next) => {
    const { error } = shoppingListMealsSchema.validate(req.body);
    JoiFlashError(error, req, res, next, "/shoppinglist");
  },
);

export const validateCategory = catchAsync(async (req, res, next) => {
  const { error } = categorySchema.validate(req.body);
  JoiFlashError(error, req, res, next, "/ingredients");
});

export const validateshoppingListIngredients = catchAsync(
  async (req, res, next) => {
    const { error } = shoppingListIngredientsSchema.validate(req.body);
    JoiFlashError(error, req, res, next, "/shoppinglist");
  },
);

export const isAuthorMeal = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const meal = await Meal.findById(id)
    .populate({ path: "weeklyItems", populate: { path: "weeklyIngredients" } })
    .populate({
      path: "replaceOnUse",
      populate: { path: "replaceOnUseIngredients" },
    })
    .populate("author");
  if (!meal) {
    req.flash("error", "Cannot find that meal");
    return res.redirect("/meals");
  }
  if (!meal.author.equals(req.user._id)) {
    req.flash("error", "You do not have permission to do that");
    return res.redirect("/meals");
  }
  next();
});

export const isAuthorIngredient = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const ingredient = await Ingredient.findById(id).populate("author");
  if (!ingredient) {
    req.flash("error", "Cannot find that ingredient");
    return res.redirect("/ingredients");
  }
  if (!ingredient.author.equals(req.user._id)) {
    req.flash("error", "You do not have permission to do that");
    return res.redirect("/ingredients");
  }
  next();
});

export const isAuthorShoppingList = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const shoppingList = await ShoppingList.findById(id).populate("author");
  if (!shoppingList) {
    req.flash("error", "Cannot find that ingredient");
    return res.redirect("/shoppinglist");
  }
  if (!shoppingList.author.equals(req.user._id)) {
    req.flash("error", "You do not have permission to do that");
    return res.redirect("/shoppinglist");
  }
  next();
});
