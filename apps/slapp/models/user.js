import { createUserSchema } from "@longrunner/shared-auth";

const User = createUserSchema({
  hasResetPasswordUsed: true,
});

export default User;
