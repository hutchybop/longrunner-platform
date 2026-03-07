import mongoose from "mongoose";

const Schema = mongoose.Schema;

const IngredientSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  cat: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

const Ingredient = mongoose.model("Ingredient", IngredientSchema);

export { Ingredient };
