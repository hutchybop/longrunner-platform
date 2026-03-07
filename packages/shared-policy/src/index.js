import mail from "@longrunner/shared-utils/mail.js";

export function createPolicyController(config = {}) {
  const { domain = "longrunner.co.uk", tandcTitle = `${domain} Information Page` } =
    config;

  return {
    cookiePolicy: (req, res) => {
      res.render("policy/cookiePolicy", {
        title: "cookiePolicy",
        css_page: "cookiePolicy",
      });
    },

    tandc: (req, res) => {
      res.render("policy/tandc", {
        captcha: res.recaptcha,
        title: tandcTitle,
        js_page: "tandc",
        css_page: "tandc",
      });
    },

    tandcPost: async (req, res) => {
      if (!req.recaptcha.error) {
        await mail(
          `Contact Form Submitted - ${domain}`,
          "Hello,\n\n" +
            `Your message to ${domain} has been submittted. The details are below` +
            "\n\n" +
            `Name: ${req.body.name}` +
            "\n\n" +
            `Email: ${req.body.email}` +
            "\n\n" +
            `Message: ${req.body.message}`,
          req.body.email,
        );

        await mail(
          `Contact Form Submitted - ${domain}`,
          "Hello,\n\n" +
            "A new message has been submitted" +
            "\n\n" +
            `Name: ${req.body.name}` +
            "\n\n" +
            `Email: ${req.body.email}` +
            "\n\n" +
            `Body: ${req.body.message}`,
        );

        req.flash("success", "Message sent.");
        res.redirect("/policy/tandc");
      } else {
        req.flash("error", "recaptcha failed, please try again");
        res.redirect("/policy/tandc");
      }
    },
  };
}

export default createPolicyController;
