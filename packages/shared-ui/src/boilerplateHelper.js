import fs from "fs";
import path from "path";

const defaultMeta = {
  metaTitle: "longrunner",
  metaDescription: "webapp",
  metaKeywords: "longrunner",
  metaAuthor: "Chris Hutchinson",
};

export const boilerplateHelper =
  (options = {}) =>
  (req, res, next) => {
    const appRoot = options.appRoot;

    if (!appRoot) {
      throw new Error(
        "boilerplateHelper requires appRoot option. Usage: boilerplateHelper({ appRoot: __dirname })",
      );
    }

    const appViewsPartials = path.join(appRoot, "views", "partials");
    const appPublic = path.join(appRoot, "public");

    const hasNavbar = fs.existsSync(path.join(appViewsPartials, "navbar.ejs"));
    const hasFooter = fs.existsSync(path.join(appViewsPartials, "footer.ejs"));
    const hasBoilerplateCss = fs.existsSync(
      path.join(appPublic, "stylesheets", "boilerplate.css"),
    );
    const hasBoilerplateJs = fs.existsSync(
      path.join(appPublic, "javascripts", "boilerplate.js"),
    );

    const includes = {};

    if (hasNavbar) {
      includes.navbar = "partials/navbar";
    }

    if (hasFooter) {
      includes.footer = "partials/footer";
    }

    includes.boilerplateScript = hasBoilerplateJs
      ? "/javascripts/boilerplate.js"
      : "/javascripts/shared-ui/javascripts/boilerplate.js";

    includes.boilerplateCss = hasBoilerplateCss
      ? "/stylesheets/boilerplate.css"
      : "/stylesheets/shared-ui/stylesheets/boilerplate.css";

    if (options.misc) {
      includes.misc = options.misc;
    }

    const meta = { ...defaultMeta, ...options.meta };

    const originalRender = res.render.bind(res);
    res.render = (view, data = {}, cb) => {
      return originalRender(
        view,
        {
          ...data,
          defaults: { ...meta, ...(data.defaults || {}) },
          includes: { ...includes, ...(data.includes || {}) },
        },
        cb,
      );
    };
    next();
  };
