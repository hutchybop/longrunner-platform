export const boilerplateHelper = () => (req, res, next) => {
  const defaultMeta = {
    metaTitle: "longrunner.co.uk landing page",
    metaDescription:
      "longrunner.co.uk is a landing page that links to the longrunner app ecosystem, including the shopping list app, quiz app, and blog app",
    metaKeywords: "Landing, Navigation, slapp, quiz, blog",
    metaAuthor: "Chris Hutchinson",
  };
  const defaultIncludes = {
    navbar: "partials/navbar",
  };
  const originalRender = res.render.bind(res);
  res.render = (view, data = {}, cb) => {
    return originalRender(
      view,
      {
        ...data,
        defaults: { ...defaultMeta, ...(data.defaults || {}) },
        includes: { ...defaultIncludes, ...(data.includes || {}) },
      },
      cb,
    );
  };
  next();
};
