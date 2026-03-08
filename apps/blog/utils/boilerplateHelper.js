export const boilerplateHelper = () => (req, res, next) => {
  const defaultMeta = {
    metaTitle: "MY IRONMAN BLOG - From start to finish, follow my journey.",
    metaDescription:
      "A blog about my Ironman triathlon journey. Follow me from my first day of training to the big day. I discuss nutrition, training plans, triathlon kit and ups and downs.",
    metaKeywords:
      "Ironman, Ironman Blog, training plan, triathlon, journey, nutrition, cycling, swim, run, shopping list",
    metaAuthor: "Chris Hutchinson",
  };
  const defaultIncludes = {
    navbar: "partials/navbar",
    footer: "partials/footer",
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
