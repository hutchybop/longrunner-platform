import { Category } from "../models/category.js";
import { Ingredient } from "../models/ingredient.js";
import { Meal } from "../models/meal.js";

export const newUserSeed = async (userId) => {
  const newCategory = new Category({
    catList: [
      "Toiletries",
      "Veg 1",
      "Veg 2",
      "Veg 3",
      "Veg 4",
      "Meat And dairy",
      "Beans And Spices",
      "Middle store",
      "Milk And bread",
      "Frozen",
      "Non food",
    ],
    author: userId,
  });
  await newCategory.save();

  const defaultUserId = process.env.DEFAULT_USER_ID;

  const defaultUserIngredients = await Ingredient.find({
    author: defaultUserId,
  });
  for (let i in defaultUserIngredients) {
    await Ingredient.create({
      name: defaultUserIngredients[i].name,
      cat: defaultUserIngredients[i].cat,
      author: userId,
    });
  }

  const defaultUserMeals = await Meal.find({ author: defaultUserId })
    .populate({ path: "weeklyItems", populate: { path: "weeklyIngredients" } })
    .populate({
      path: "replaceOnUse",
      populate: { path: "replaceOnUseIngredients" },
    });

  for (let m in defaultUserMeals) {
    let weeklyItems = [];
    for (let i in defaultUserMeals[m].weeklyItems) {
      let name = defaultUserMeals[m].weeklyItems[i].weeklyIngredients.name;
      let qty = defaultUserMeals[m].weeklyItems[i].qty;
      let weeklyIng = await Ingredient.findOne({
        $and: [{ name }, { author: userId }],
      });
      weeklyItems.push({
        qty,
        weeklyIngredients: weeklyIng,
      });
    }

    let replaceOnUseItems = [];
    for (let i in defaultUserMeals[m].replaceOnUse) {
      let name =
        defaultUserMeals[m].replaceOnUse[i].replaceOnUseIngredients.name;
      let qty = defaultUserMeals[m].replaceOnUse[i].qty;
      let replaceOnUseIng = await Ingredient.findOne({
        $and: [{ name }, { author: userId }],
      });
      replaceOnUseItems.push({
        qty,
        replaceOnUseIngredients: replaceOnUseIng,
      });
    }

    const newMeal = new Meal({
      default: defaultUserMeals[m].default,
      mealName: defaultUserMeals[m].mealName,
      mealRecipe: defaultUserMeals[m].mealRecipe,
      weeklyItems: weeklyItems,
      replaceOnUse: replaceOnUseItems,
      mealType: defaultUserMeals[m].mealType,
      author: userId,
    });
    await newMeal.save();
  }
};
