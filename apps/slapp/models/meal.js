import mongoose from "mongoose";
const Schema = mongoose.Schema;

const mealType = [
  "Breakfast",
  "Lunch",
  "Main",
  "Constant Weekly Items",
  "Nonfood Items",
  "Archive",
];
const defaults = [
  "friday",
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "lunchWeekday",
  "lunchWeekend",
  "breakfast",
  "none",
  "unAssig",
];

const MealSchema = new Schema({
  mealName: {
    type: String,
    required: true,
  },
  weeklyItems: [
    {
      qty: {
        type: Number,
        required: true,
      },
      weeklyIngredients: {
        type: Schema.Types.ObjectId,
        ref: "Ingredient",
      },
    },
  ],
  replaceOnUse: [
    {
      qty: {
        type: Number,
        required: true,
      },
      replaceOnUseIngredients: {
        type: Schema.Types.ObjectId,
        ref: "Ingredient",
      },
    },
  ],
  mealType: {
    type: String,
    enum: mealType,
  },
  mealRecipe: String,
  default: [
    {
      type: String,
      enum: defaults,
    },
  ],
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

const Meal = mongoose.model("Meal", MealSchema);

export { Meal, mealType, defaults };
