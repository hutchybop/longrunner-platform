export const notFound = (req, res) => {
  res.status(404).render("policy/error", {
    err: { message: "Page Not Found", statusCode: 404 },
    title: "Error - Page Not Found",
    css_page: "error",
  });
};
