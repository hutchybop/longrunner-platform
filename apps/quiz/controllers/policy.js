import { createPolicyController } from "@longrunner/shared-policy";

const policy = createPolicyController({
  domain: "quiz.longrunner.co.uk",
  tandcTitle: "quiz.longrunner.co.uk Information Page",
  policyContent: {
    aboutWebsite:
      "quiz.longrunner.co.uk is a quiz application where users can take quizzes individually or with others. Users can choose to answer between 10 to 50 questions and can adjust the difficulty level. The questions are sourced from the API provided by The Trivia API (the-trivia-api.com)",
    appropriateUse:
      "Use the website responsibly and respect other users. You agree not to engage in any behavior that disrupts the quiz experience for others or compromises the security and integrity of the website. Quiz Masters should manage quizzes fairly and not exclude participants without valid reasons.",
    contentDisclaimerPrimary:
      "The quizzes on quiz.longrunner.co.uk are for entertainment purposes only. The questions are sourced from a third-party API and we cannot guarantee the accuracy or appropriateness of all questions.",
    contentDisclaimerSecondary:
      "We are not responsible for any offense or discomfort caused by quiz questions. Players participate at their own discretion and should skip any questions they find uncomfortable.",
    intellectualProperty:
      "The content, design, and code of quiz.longrunner.co.uk are owned by the website creator. You may not reproduce, distribute, or use any part of the website or its content without prior written consent.",
    limitationOfLiability:
      'quiz.longrunner.co.uk is provided on an "as is" basis. We make no warranties or representations, express or implied, regarding the website\'s availability, functionality, or accuracy of content. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of the website. Additionally, the website may be taken down or modified at any time without prior notice, and you should not rely on its continued availability.',
    cookieName: "quiz_longrunner",
    cookiePurpose:
      "This cookie keeps the user logged in and maintains their session across different pages. It stores your authentication information to provide a seamless browsing experience when using the quiz application.",
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
