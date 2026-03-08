export const landing = (req, res) => {
  res.render("longrunner/landing", {
    title: "longrunner apps",
    css_page: "longrunnerLanding",
  });
};
