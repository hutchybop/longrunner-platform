import { createPolicyController } from "@longrunner/shared-policy";

const policy = createPolicyController({
  domain: "longrunner.co.uk",
  tandcTitle: "longrunner.co.uk Information Page",
  policyContent: {
    aboutWebsite:
      "longrunner.co.uk is a landing page that links to the longrunner app ecosystem, including the shopping list app, quiz app, and blog app.",
    appropriateUse:
      "Use the website responsibly and respect other users. You agree not to engage in any behavior that disrupts the experience for others or compromises the security and integrity of the website.",
    contentDisclaimerPrimary:
      "longrunner.co.uk provides links and information about longrunner applications. Content is provided for informational purposes only.",
    contentDisclaimerSecondary:
      "Each linked app may have its own terms and policies. You are responsible for reviewing those policies before using the linked services.",
    intellectualProperty:
      "The content, design, and code of longrunner.co.uk are owned by the website creator. You may not reproduce, distribute, or use any part of the website or its content without prior written consent.",
    limitationOfLiability:
      'longrunner.co.uk is provided on an "as is" basis. We make no warranties or representations, express or implied, regarding the website\'s availability, functionality, or accuracy of content. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the website. Additionally, the website may be taken down or modified at any time without prior notice, and you should not rely on its continued availability.',
    cookieName: "landing_longrunner",
    cookiePurpose:
      "This cookie stores temporary session information used for security features such as flash messages and contact form handling.",
  },
});

export const { cookiePolicy, tandc, tandcPost } = policy;

export const notFound = (req, res) => {
  res.status(404).render("policy/error", {
    err: { message: "Page Not Found", statusCode: 404 },
    title: "Error - Page Not Found",
    css_page: "shared-policy/error",
  });
};
