import { createPolicyController } from "@longrunner/shared-policy";

const policy = createPolicyController({
  domain: "slapp.longrunner.co.uk",
  tandcTitle: "slapp.longrunner.co.uk Information Page",
  policyContent: {
    aboutWebsite:
      "slapp.longrunner.co.uk is a personal meal and recipe management application where users can manage their meals, recipes, ingredients, and shopping lists. The website offers a personalized experience by storing and displaying your information, such as account details, meal plans, and related data.",
    contentDisclaimerPrimary:
      "When you create an account on slapp.longrunner.co.uk, we may provide you with recipes as part of our service. Please note that these recipes are provided for your convenience and personal use. We make no warranties or representations regarding the quality, edibility, or suitability of the recipes or food prepared from them.",
    contentDisclaimerSecondary:
      "You are solely responsible for ensuring that any food prepared from the recipes is safe and suitable for consumption. We do not accept any liability for any issues or concerns arising from the use of these recipes, including but not limited to health or safety concerns.",
    intellectualProperty:
      "The content, design, and code of slapp.longrunner.co.uk are owned by the website creator. You may not reproduce, distribute, or use any part of the website or its content without prior written consent.",
    limitationOfLiability:
      'slapp.longrunner.co.uk is provided on an "as is" basis. We make no warranties or representations, express or implied, regarding the website\'s availability, functionality, or accuracy of content. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the website. Additionally, the website may be taken down or modified at any time without prior notice, and you should not rely on its continued availability.',
    cookieName: "slapp",
    cookiePurpose:
      "This cookie keeps the user logged in and loads their personal information, including meals, recipes, ingredients, shopping lists, and account details. It ensures a seamless user experience by maintaining your session across different pages.",
  },
});

export const { cookiePolicy, tandc, tandcPost } = policy;

export const notFound = (req, res) => {
  res.status(404).render("policy/error", {
    err: { message: "Page Not Found", statusCode: 404 },
    title: "Error - Page Not Found",
    css_page: "error",
  });
};
