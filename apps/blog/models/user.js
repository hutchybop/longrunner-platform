import { createUserSchema } from "@longrunner/shared-auth";

const User = createUserSchema({
  hasRole: true,
  hasResetPasswordUsed: true,
  roleEnum: ["user", "admin"],
  roleDefault: "user",
});

export default User;
