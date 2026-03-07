import { createPolicyController } from "@longrunner/shared-policy";

const policy = createPolicyController({
  domain: "blog.longrunner.co.uk",
  tandcTitle: "blog.longrunner.co.uk Information Page",
  policyContent: {
    aboutWebsite:
      "blog.longrunner.co.uk is a personal Ironman training blog where users can read about training experiences, view posts about triathlon journeys, and leave reviews on blog posts. The website offers a platform to share training insights, race reports, and personal achievements in the world of Ironman and triathlon competitions.",
    appropriateUse:
      "Use the website responsibly and respect other users. You agree not to engage in any behavior that disrupts the experience for others or compromises the security and integrity of the website. When leaving reviews, ensure they are constructive, relevant, and respectful.",
    contentDisclaimerPrimary:
      "The blog posts on blog.longrunner.co.uk represent personal experiences, training methods, and opinions related to Ironman and triathlon training. The content is provided for informational and entertainment purposes only. We make no warranties or representations regarding the accuracy, completeness, or suitability of the training advice, race reports, or other content shared on this platform.",
    contentDisclaimerSecondary:
      "You are solely responsible for determining the appropriateness of any training advice or information shared on this blog for your personal situation. We recommend consulting with qualified coaches or medical professionals before undertaking any new training regimen. We do not accept any liability for any injuries, health issues, or other concerns arising from the use of information shared on this blog.",
    intellectualProperty:
      "The content, design, and code of blog.longrunner.co.uk are owned by the website creator. You may not reproduce, distribute, or use any part of the website or its content without prior written consent. This includes blog posts, training reports, photographs, and other original content shared on this platform.",
    limitationOfLiability:
      'blog.longrunner.co.uk is provided on an "as is" basis. We make no warranties or representations, express or implied, regarding the website\'s availability, functionality, or accuracy of content. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the website, including any injuries or health issues resulting from following training advice shared on this blog. Additionally, the website may be taken down or modified at any time without prior notice, and you should not rely on its continued availability.',
    cookieName: "blog_longrunner",
    cookiePurpose:
      "This cookie keeps the user logged in and maintains their session across different pages. It stores your authentication information to provide a seamless browsing experience when reading blog posts and leaving reviews.",
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
