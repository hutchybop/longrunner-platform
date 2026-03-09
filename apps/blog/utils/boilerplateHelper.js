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
