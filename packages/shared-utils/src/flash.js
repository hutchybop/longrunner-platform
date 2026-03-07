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
      req.session.flash[type].push(message);
    };

    next();
  };
}
