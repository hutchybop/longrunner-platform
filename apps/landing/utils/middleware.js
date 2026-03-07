import { createAuthMiddleware } from "@longrunner/shared-middleware";
import { tandcSchema } from "@longrunner/shared-schemas";

const middleware = createAuthMiddleware({
  schemas: {
    tandcSchema,
  },
});

export const { validateTandC } = middleware;
