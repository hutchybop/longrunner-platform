import { Joi } from "@longrunner/shared-schemas";

export const mealSchema = Joi.object({
  mealName: Joi.string().required().escapeHTML(),
  mealType: Joi.string().required(),
  mealRecipe: Joi.string().allow("").optional().escapeHTML(),
  ingredient: Joi.object({
    name: Joi.alternatives().try(
      Joi.array().unique().items(Joi.string().required().escapeHTML()),
      Joi.string().required().escapeHTML(),
    ),
    qty: Joi.alternatives().try(
      Joi.array().items(Joi.number().required().min(0)),
      Joi.number().required().min(0),
    ),
    addTo: Joi.alternatives().try(
      Joi.array().items(Joi.string().valid("W", "R").required()),
      Joi.string().valid("W", "R").required(),
    ),
  }),
  newIngredient: Joi.object({
    name: Joi.alternatives().try(
      Joi.array().unique().items(Joi.string().required().escapeHTML()),
      Joi.string().required().escapeHTML(),
    ),
    newQty: Joi.alternatives().try(
      Joi.array().items(Joi.number().required().min(0)),
      Joi.number().required().min(0),
    ),
    newCat: Joi.alternatives().try(
      Joi.array().items(Joi.string().escapeHTML().required()),
      Joi.string().escapeHTML().required(),
    ),
    newAddTo: Joi.alternatives().try(
      Joi.array().items(Joi.string().valid("W(n)", "R(n)").required()),
      Joi.string().valid("W(n)", "R(n)").required(),
    ),
  }),
})
  .or("ingredient", "newIngredient")
  .required();

export const ingredientSchema = Joi.object({
  name: Joi.string().required().escapeHTML(),
  cat: Joi.string().escapeHTML().required(),
}).required();

export const defaultSchema = Joi.object({
  friday: Joi.string().required().escapeHTML(),
  saturday: Joi.string().required().escapeHTML(),
  sunday: Joi.string().required().escapeHTML(),
  monday: Joi.string().required().escapeHTML(),
  tuesday: Joi.string().required().escapeHTML(),
  wednesday: Joi.string().required().escapeHTML(),
  thursday: Joi.string().required().escapeHTML(),
  lunchWeekday: Joi.string().required().escapeHTML(),
  lunchWeekend: Joi.string().required().escapeHTML(),
  breakfast: Joi.string().required().escapeHTML(),
}).required();

export const shoppingListMealsSchema = Joi.object({
  name: Joi.string().required().escapeHTML(),
  friday: Joi.string().required().escapeHTML(),
  saturday: Joi.string().required().escapeHTML(),
  sunday: Joi.string().required().escapeHTML(),
  monday: Joi.string().required().escapeHTML(),
  tuesday: Joi.string().required().escapeHTML(),
  wednesday: Joi.string().required().escapeHTML(),
  thursday: Joi.string().required().escapeHTML(),
  lunchWeekday: Joi.string().required().escapeHTML(),
  lunchWeekend: Joi.string().required().escapeHTML(),
  breakfast: Joi.string().required().escapeHTML(),
}).required();

export const categorySchema = Joi.object().pattern(
  Joi.string().escapeHTML().required(),
  Joi.alternatives().try(
    Joi.array().items(Joi.string().escapeHTML().required()),
    Joi.string().escapeHTML().required(),
  ),
);

export const shoppingListIngredientsSchema = Joi.object({
  list: Joi.object({
    ingredient: Joi.alternatives().try(
      Joi.array().items(Joi.string().required().escapeHTML()),
      Joi.string().required().escapeHTML(),
    ),
    qty: Joi.alternatives().try(
      Joi.array().items(Joi.number().required().min(0)),
      Joi.number().required().min(0),
    ),
    cat: Joi.alternatives().try(
      Joi.array().items(Joi.string().escapeHTML().required()),
      Joi.string().escapeHTML().required(),
    ),
  }),
  extra: Joi.object({
    ingredient: Joi.alternatives().try(
      Joi.array().items(Joi.string().required().escapeHTML()),
      Joi.string().required().escapeHTML(),
    ),
    qty: Joi.alternatives().try(
      Joi.array().items(Joi.number().required().min(0)),
      Joi.number().required().min(0),
    ),
    cat: Joi.alternatives().try(
      Joi.array().items(Joi.string().escapeHTML().required()),
      Joi.string().escapeHTML().required(),
    ),
  }),
  nonFood: Joi.object({
    ingredient: Joi.alternatives().try(
      Joi.array().items(Joi.string().required().escapeHTML()),
      Joi.string().required().escapeHTML(),
    ),
    qty: Joi.alternatives().try(
      Joi.array().items(Joi.number().required().min(0)),
      Joi.number().required().min(0),
    ),
    cat: Joi.alternatives().try(
      Joi.array().items(Joi.string().escapeHTML().required()),
      Joi.string().escapeHTML().required(),
    ),
  }),
  removed: Joi.object({
    ingredient: Joi.alternatives().try(
      Joi.array().items(Joi.string().required().escapeHTML()),
      Joi.string().required().escapeHTML(),
    ),
    qty: Joi.alternatives().try(
      Joi.array().items(Joi.number().required().min(0)),
      Joi.number().required().min(0),
    ),
    cat: Joi.alternatives().try(
      Joi.array().items(Joi.string().escapeHTML().required()),
      Joi.string().escapeHTML().required(),
    ),
  }),
});
