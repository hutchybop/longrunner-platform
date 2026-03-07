/* eslint-disable no-unused-vars */
export const errorHandler = (err, req, res, next) => {
  const { statusCode = 500 } = err;

  if (err.name === "CastError") {
    req.flash("error", `${err.name} The information provided cannot be found!`);
    return res.back();
  }

  if (err.message === '"email" must be a valid email') {
    req.flash("error", "You need to enter a valid email address.");
    return res.redirect(req.originalUrl);
  }

  if (!err.message) err.message = "Oh No, something went wrong.";

  res.status(statusCode).render("policy/error", {
    err,
    title: "Error - Something Went Wrong",
    css_page: "error",
  });
};
