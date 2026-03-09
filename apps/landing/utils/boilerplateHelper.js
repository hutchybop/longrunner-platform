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
    metaTitle: "longrunner.co.uk landing page",
    metaDescription:
      "longrunner.co.uk is a landing page that links to the longrunner app ecosystem, including the shopping list app, quiz app, and blog app",
    metaKeywords: "Landing, Navigation, slapp, quiz, blog",
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
