import mongoose from "mongoose";

const Schema = mongoose.Schema;

const BlogIMSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    img: {
      type: String,
    },
    post: {
      type: String,
      required: true,
    },
    num: {
      type: Number,
    },
    reviews: [
      {
        type: Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
  },
  { timestamps: true },
);

const BlogIM = mongoose.model("BlogIM", BlogIMSchema);

export default BlogIM;
