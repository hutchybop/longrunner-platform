import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ShoppingListSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    friday: {
      type: Schema.Types.ObjectId,
      ref: "Meal",
    },
    saturday: {
      type: Schema.Types.ObjectId,
      ref: "Meal",
    },
    sunday: {
      type: Schema.Types.ObjectId,
      ref: "Meal",
    },
    monday: {
      type: Schema.Types.ObjectId,
      ref: "Meal",
    },
    tuesday: {
      type: Schema.Types.ObjectId,
      ref: "Meal",
    },
    wednesday: {
      type: Schema.Types.ObjectId,
      ref: "Meal",
    },
    thursday: {
      type: Schema.Types.ObjectId,
      ref: "Meal",
    },
    lunchWeekday: {
      type: Schema.Types.ObjectId,
      ref: "Meal",
    },
    lunchWeekend: {
      type: Schema.Types.ObjectId,
      ref: "Meal",
    },
    breakfast: {
      type: Schema.Types.ObjectId,
      ref: "Meal",
    },
    items: [],
    editVer: {},
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const ShoppingList = mongoose.model("ShoppingList", ShoppingListSchema);

export { ShoppingList };
