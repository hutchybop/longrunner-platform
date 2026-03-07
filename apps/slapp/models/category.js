import mongoose from "mongoose";

const Schema = mongoose.Schema;

const CategorySchema = new Schema({
  catList: {},
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

const Category = mongoose.model("Category", CategorySchema);
export { Category };
