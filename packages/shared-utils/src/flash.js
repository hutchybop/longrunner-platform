import sanitizeHtml from "sanitize-html";

const FLASH_SANITIZE_OPTIONS = {
  allowedTags: ["strong", "br"],
  allowedAttributes: {},
};

const sanitizeFlashMessage = (message) =>
  sanitizeHtml(String(message), FLASH_SANITIZE_OPTIONS);

export default function flashMiddleware() {
  return function (req, res, next) {
    if (!req.session) {
      return next(new Error("Session middleware missing"));
    }

    res.locals.flash = req.session.flash || {};

    delete req.session.flash;

    req.flash = (type, message) => {
      req.session.flash ??= {};
      req.session.flash[type] ??= [];

      if (Array.isArray(message)) {
        message.forEach((msg) => {
          req.session.flash[type].push(sanitizeFlashMessage(msg));
        });
        return;
      }

      req.session.flash[type].push(sanitizeFlashMessage(message));
    };

    next();
  };
}
