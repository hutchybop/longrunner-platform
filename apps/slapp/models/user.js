import { createUserSchema } from "@longrunner/shared-auth";

const User = createUserSchema({
  hasResetPasswordUsed: true,
  collectionName: "slapp_users",
});

export default User;
