export const boilerplateHelper = () => (req, res, next) => {
  const defaultMeta = {
    metaTitle: "Shopping List App. - Weekly shopping list creator",
    metaDescription:
      "Create meals, add ingredients and recipes, choose weekly a weekly meal plan and create your shopping list.",
    metaKeywords:
      "shooping, shopping list, meals, receipes, ingredients, food, groceries, grocery list, grocery",
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
