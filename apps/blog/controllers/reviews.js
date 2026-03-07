import Review from "../models/review.js";
import BlogIM from "../models/blogIM.js";
import mail from "@longrunner/shared-utils/mail.js";
import ContentFilter from "../utils/contentFilter.js";

export const create = async (req, res) => {
  const blogIM = await BlogIM.findById(req.params.id);
  const review = new Review(req.body.review);
  review.blogIM = blogIM._id;
  let flashmsg;

  const contentValidation = ContentFilter.validateReview(review.body);

  if (contentValidation.isSpam) {
    flashmsg = "Review flagged for possible spam and sent for admin review";

    if (!req.user) {
      review.author = "618ae270defe900f7f2980d5";
    } else {
      review.author = req.user._id;
    }

    review.isFlagged = true;
    review.flagReason =
      contentValidation.score >= 10
        ? "High spam score: " + contentValidation.reasons.join(", ")
        : "Spam detected: " + contentValidation.reasons.join(", ");

    await review.save();

    mail(
      "Spam Review Flagged for Admin Review",
      "Hey,\n\n" +
        "A spam review has been flagged with the following details:\n\n" +
        "Original Content: " +
        contentValidation.originalContent +
        "\n\n" +
        "Spam Score: " +
        contentValidation.score +
        "\n" +
        "Reasons: " +
        contentValidation.reasons.join(", ") +
        "\n\n" +
        "By: " +
        (req.user ? req.user.username : "anonymous") +
        "\n\n" +
        "Spam Details: " +
        JSON.stringify(contentValidation.details, null, 2),
    );

    req.flash("success", flashmsg);
    return res.redirect(`/blogim/${blogIM._id}`);
  }

  review.body = contentValidation.sanitizedContent;

  review.spamScore = contentValidation.score;

  if (contentValidation.score >= 3 && contentValidation.score < 5) {
    review.isFlagged = true;
    review.flagReason =
      "Moderate spam score: " + contentValidation.reasons.join(", ");
  }

  if (!req.user) {
    review.author = "618ae270defe900f7f2980d5";
    flashmsg = "Review submitted successfully!";
  } else {
    review.author = req.user._id;
    flashmsg = "Review submitted successfully!";
  }

  await review.save();

  if (!review.isFlagged) {
    blogIM.reviews.push(review);
    await blogIM.save();
  }

  if (review.isFlagged) {
    mail(
      "Spam Review Flagged for Admin Review",
      "Hey,\n\n" +
        "A spam review has been flagged with the following details:\n\n" +
        "Original Content: " +
        contentValidation.originalContent +
        "\n\n" +
        "Spam Score: " +
        contentValidation.score +
        "\n" +
        "Reasons: " +
        contentValidation.reasons.join(", ") +
        "\n\n" +
        "By: " +
        (req.user ? req.user.username : "anonymous") +
        "\n\n" +
        "Spam Details: " +
        JSON.stringify(contentValidation.details, null, 2),
    );
  }

  req.flash("success", flashmsg);
  return res.redirect(`/blogim/${blogIM._id}`);
};

export const deleteReview = async (req, res) => {
  const { id, reviewId } = req.params;
  const blogIM = await BlogIM.findById(id);
  const review = await Review.findById(reviewId);

  await Review.findByIdAndDelete(req.params.reviewId);
  await BlogIM.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  req.flash("success", "Successfully deleted review!");

  mail(
    "Review deleted on blog.longrunner.co.uk",
    "Hello,\n\n" +
      "A review has been deleted on " +
      '"' +
      blogIM.title +
      '"' +
      "\n\n" +
      "Reading: " +
      review.body +
      "\n\nBy: " +
      req.user.username,
  );

  res.redirect(`/blogim/${id}`);
};

export const reviewLogin = (req, res) => {
  res.redirect(`/blogim/${req.params.id}`);
};
