import { createPolicyController } from "@longrunner/shared-policy";

const policyController = createPolicyController({
  domain: "slapp.longrunner.co.uk",
  tandcTitle: "slapp.longrunner.co.uk Information Page",
});

export const { cookiePolicy, tandc, tandcPost } = policyController;

export default policyController;
