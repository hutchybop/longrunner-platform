import { createPolicyController } from "@longrunner/shared-policy";

const policyController = createPolicyController({
  domain: "blog.longrunner.co.uk",
  tandcTitle: "blog.longrunner.co.uk Information Page",
});

export const { cookiePolicy, tandc, tandcPost } = policyController;

export default policyController;
