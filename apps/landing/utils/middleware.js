import { createPolicyMiddleware } from "@longrunner/shared-middleware";
import { createPolicySchemas } from "@longrunner/shared-schemas";

const { tandcSchema } = createPolicySchemas();

const middleware = createPolicyMiddleware({
  schemas: {
    tandcSchema,
  },
});

export const { validateTandC } = middleware;
