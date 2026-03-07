import { createUsersController } from "@longrunner/shared-auth/controllers.js";
import { Meal } from "../models/meal.js";
import { Ingredient } from "../models/ingredient.js";
import { ShoppingList } from "../models/shoppingList.js";
import { Category } from "../models/category.js";
import { newUserSeed } from "../utils/newUserSeed.js";

const usersController = createUsersController({
  domain: "slapp.longrunner.co.uk",
  protectedUsername: "defaultMeals",
  onRegister: async (req) => {
    newUserSeed(req.user._id);
  },
  onDelete: async (userId) => {
    await Ingredient.deleteMany({ author: userId });
    await Category.deleteMany({ author: userId });
    await Meal.deleteMany({ author: userId });
    await ShoppingList.deleteMany({ author: userId });
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
