import { createUsersController } from "@longrunner/shared-auth/controllers.js";
import Review from "../models/review.js";

const usersController = createUsersController({
  domain: "blog.longrunner.co.uk",
  protectedUsername: "defaultMeals",
  onDelete: async (userId) => {
    await Review.deleteMany({ author: userId });
  },
});

export const {
  register,
  registerPost,
  login,
  loginPost,
  logout,
  forgot,
  forgotPost,
  reset,
  resetPost,
  details,
  detailsPost,
  deletePre,
  deleteUser,
} = usersController;

export default usersController;
