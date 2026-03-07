import mail from "@longrunner/shared-utils/mail.js";

export function createPolicyController(config = {}) {
  const {
    domain = "longrunner.co.uk",
    tandcTitle = `${domain} Information Page`,
    assetsPrefix = "shared-policy",
    policyContent = {},
    backLinks = {},
    backLabels = {},
  } = config;

  const resolvedBackLinks = {
    guest: "/auth/login",
    user: "/auth/details",
    ...backLinks,
  };

  const resolvedBackLabels = {
    guest: "Back to Login",
    user: "Back to Account",
    ...backLabels,
  };

  const resolveBackButton = (req) => {
    const isLoggedIn = Boolean(req.user);
    return {
      backHref: isLoggedIn ? resolvedBackLinks.user : resolvedBackLinks.guest,
      backLabel: isLoggedIn ? resolvedBackLabels.user : resolvedBackLabels.guest,
    };
  };

  const defaultPolicyContent = {
    intro: `Welcome to ${domain}. By accessing and using our website, you agree to comply with and be bound by these Terms and Conditions. Please read them carefully.`,
    aboutWebsite:
      "This website provides user account functionality and app-specific features. Please use it responsibly and in accordance with these terms.",
    appropriateUse:
      "Use the website responsibly and respect other users. You agree not to engage in any behavior that disrupts the experience for others or compromises the security and integrity of the website.",
    contentDisclaimerPrimary:
      "Content is provided for informational purposes only. We make no warranties or representations regarding accuracy, completeness, or suitability.",
    contentDisclaimerSecondary:
      "You are responsible for how you use information and features provided on this website.",
    intellectualProperty:
      `The content, design, and code of ${domain} are owned by the website creator. You may not reproduce, distribute, or use any part of the website or its content without prior written consent.`,
    limitationOfLiability:
      `${domain} is provided on an "as is" basis. We make no warranties or representations, express or implied, regarding the website's availability, functionality, or accuracy of content. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the website. Additionally, the website may be taken down or modified at any time without prior notice, and you should not rely on its continued availability.`,
    cookieName: "session",
    cookiePurpose:
      "This cookie keeps the user logged in and maintains their session across different pages.",
  };

  const resolvedPolicyContent = {
    ...defaultPolicyContent,
    ...policyContent,
  };

  return {
    cookiePolicy: (req, res) => {
      const { backHref, backLabel } = resolveBackButton(req);
      res.render("policy/cookiePolicy", {
        title: "cookiePolicy",
        css_page: `${assetsPrefix}/cookiePolicy`,
        domain,
        policyContent: resolvedPolicyContent,
        backHref,
        backLabel,
      });
    },

    tandc: (req, res) => {
      const { backHref, backLabel } = resolveBackButton(req);
      res.render("policy/tandc", {
        captcha: res.recaptcha,
        title: tandcTitle,
        js_page: `${assetsPrefix}/tandc`,
        css_page: `${assetsPrefix}/tandc`,
        domain,
        policyContent: resolvedPolicyContent,
        backHref,
        backLabel,
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
