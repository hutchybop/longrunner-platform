import { Ingredient } from "../models/ingredient.js";
import { Category } from "../models/category.js";
import { Meal } from "../models/meal.js";
import { toUpperCase } from "../utils/toUpperCase.js";

export const index = async (req, res) => {
  let catUser = await Category.find({ author: req.user.id });
  let catArray = catUser[0].catList;

  let ingredients = await Ingredient.find({ author: req.user._id });
  ingredients.sort((a, b) => a.name.localeCompare(b.name));

  res.render("ingredients", {
    ingredients,
    catArray,
    title: "All Ingredients",
    css_page: "ingredientsIndex",
  });
};

export const edit = async (req, res) => {
  const { id } = req.params;
  const ingredient = await Ingredient.findById(id);

  let catUser = await Category.find({ author: req.user.id });
  let catArray = catUser[0].catList;

  res.render("ingredients/edit", {
    ingredient,
    catArray,
    title: `Edit ${ingredient.name}`,
    js_page: "ingredientEdit",
  });
};

export const update = async (req, res) => {
  const { id } = req.params;
  let oldName = await Ingredient.findById(id);
  let { name, cat } = req.body;

  name = toUpperCase(name);

  const ingredients = await Ingredient.find({ author: req.user._id });
  for (let i in ingredients) {
    if (ingredients[i].name === name && ingredients[i].id !== id) {
      req.flash(
        "error",
        `You already have an ingredient named: '${name}', nothing changed`,
      );
      return res.redirect(`/ingredients/${id}/edit`);
    }
  }
  if (oldName.name === name && oldName.cat === cat) {
    req.flash("error", `Both values are unchanged, nothing updated`);
    return res.redirect(`/ingredients/${id}/edit`);
  } else {
    await Ingredient.findByIdAndUpdate(id, { name, cat });

    req.flash("success", `'${oldName.name}' updated`);
    return res.redirect(`/ingredients`);
  }
};

export const deleteIngredient = async (req, res) => {
  const { id } = req.params;

  const meals = await Meal.find({ author: req.user.id })
    .populate({ path: "weeklyItems", populate: { path: "weeklyIngredients" } })
    .populate({
      path: "replaceOnUse",
      populate: { path: "replaceOnUseIngredients" },
    });

  for (let m in meals) {
    for (let i in meals[m].weeklyItems) {
      if (meals[m].weeklyItems[i].weeklyIngredients.id === id) {
        meals[m].weeklyItems.splice(i, 1);
        let newWeeklyItems = meals[m].weeklyItems;
        await Meal.findByIdAndUpdate(meals[m].id, {
          weeklyItems: newWeeklyItems,
        });
      }
    }
    for (let i in meals[m].replaceOnUse) {
      if (meals[m].replaceOnUse[i].replaceOnUseIngredients.id === id) {
        meals[m].replaceOnUse.splice(i, 1);
        let newReplaceOnUseItems = meals[m].replaceOnUse;
        await Meal.findByIdAndUpdate(meals[m].id, {
          replaceOnUse: newReplaceOnUseItems,
        });
      }
    }
  }

  const ing = await Ingredient.findByIdAndDelete(id);

  req.flash("success", `Succesfully deleted '${ing.name}'`);
  res.redirect("/ingredients");
};
