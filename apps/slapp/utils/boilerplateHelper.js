import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appBoilerplateJsPath = path.join(
  __dirname,
  "..",
  "public",
  "javascripts",
  "boilerplate.js",
);
const boilerplateScript = fs.existsSync(appBoilerplateJsPath)
  ? "/javascripts/boilerplate.js"
  : "/javascripts/shared-ui/javascripts/boilerplate.js";

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
    boilerplateScript,
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
