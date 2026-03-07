import { Meal } from "../models/meal.js";
import { ShoppingList } from "../models/shoppingList.js";
import { Category } from "../models/category.js";
import { copyListFunc } from "../utils/copyToClip.js";

export const landing = async (req, res) => {
  if (req.user === undefined || req.user === null) {
    if (req.query.success) {
      res.render("shoppinglist/slapp", {
        title: "Shopping List App - Create Your Weekly ShoppingList",
        css_page: "slSlapp",
        success: req.query.success,
      });
    } else {
      res.render("shoppinglist/slapp", {
        title: "Shopping List App - Create Your Weekly ShoppingList",
        css_page: "slSlapp",
      });
    }
  } else {
    const list = await ShoppingList.find({ author: req.user._id });
    list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

    if (list.length === 0) {
      res.redirect("/shoppinglist");
    } else {
      res.redirect("/shoppinglist/" + list[0]._id);
    }
  }
};

export const index = async (req, res) => {
  const list = await ShoppingList.find({ author: req.user._id });
  list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  res.render("shoppinglist/index", {
    list,
    title: "All Shopping Lists",
    js_page: "slIndex",
  });
};

export const newMeals = async (req, res) => {
  const meals = await Meal.find({ author: req.user._id });
  meals.sort((a, b) => a.mealName.localeCompare(b.mealName));
  res.render("shoppinglist/newMeals", {
    meals,
    title: "Create A Shopping List",
    js_page: "slNewMeals",
    css_page: "slNewMeals",
  });
};

export const createMeals = async (req, res) => {
  const listLength = await ShoppingList.countDocuments({
    author: req.user._id,
  });
  if (listLength > 9) {
    const slist = await ShoppingList.find({ author: req.user._id });
    slist.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    let dropId = slist[slist.length - 1].id;
    await ShoppingList.findByIdAndDelete(dropId);
  }

  let meals = {};
  for (let i in req.body) {
    if (req.body[i] === "none") {
      let n = await Meal.findOne({ mealName: "None" });
      meals[i] = n;
    }
    if (i !== "name" && req.body[i] !== "none") {
      let m = await Meal.findOne({
        $and: [{ _id: req.body[i] }, { author: req.user._id }],
      })
        .populate("weeklyItems.weeklyIngredients")
        .populate("replaceOnUse.replaceOnUseIngredients");

      meals[i] = m;
    }
  }

  const others = await Meal.find({
    $and: [
      { mealType: { $in: ["Constant Weekly Items", "Nonfood Items"] } },
      { author: req.user._id },
    ],
  })
    .populate("weeklyItems.weeklyIngredients")
    .populate("replaceOnUse.replaceOnUseIngredients");

  let list = {};
  for (let i in meals) {
    for (let m of meals[i].weeklyItems) {
      let weeklyName = m.weeklyIngredients.name;
      let weeklyCat = m.weeklyIngredients.cat;
      let weeklyQty = m.qty;
      if (weeklyName in list) {
        let newQty = list[weeklyName][0] + weeklyQty;
        list[weeklyName] = [newQty, weeklyCat];
      } else {
        list[weeklyName] = [weeklyQty, weeklyCat];
      }
    }
  }
  for (let i in others) {
    for (let m of others[i].weeklyItems) {
      let weeklyName = m.weeklyIngredients.name;
      let weeklyCat = m.weeklyIngredients.cat;
      let weeklyQty = m.qty;
      if (weeklyName in list) {
        let newQty = list[weeklyName][0] + weeklyQty;
        list[weeklyName] = [newQty, weeklyCat];
      } else {
        list[weeklyName] = [weeklyQty, weeklyCat];
      }
    }
  }

  let extra = {};
  let nonFood = {};
  for (let i in meals) {
    for (let m of meals[i].replaceOnUse) {
      let replaceOnUseName = m.replaceOnUseIngredients.name;
      let replaceOnUseCat = m.replaceOnUseIngredients.cat;
      let replaceOnUseQty = m.qty;
      if (replaceOnUseName in extra) {
        let newQty = extra[replaceOnUseName][0] + replaceOnUseQty;
        extra[replaceOnUseName] = [newQty, replaceOnUseCat];
      } else {
        extra[replaceOnUseName] = [replaceOnUseQty, replaceOnUseCat];
      }
    }
  }
  for (let i in others) {
    for (let m of others[i].replaceOnUse) {
      let replaceOnUseName = m.replaceOnUseIngredients.name;
      let replaceOnUseCat = m.replaceOnUseIngredients.cat;
      let replaceOnUseQty = m.qty;
      if (others[i].mealType === "Nonfood Items") {
        nonFood[replaceOnUseName] = [replaceOnUseQty, replaceOnUseCat];
      } else {
        if (replaceOnUseName in extra) {
          let newQty = extra[replaceOnUseName][0] + replaceOnUseQty;
          extra[replaceOnUseName] = [newQty, replaceOnUseCat];
        } else {
          extra[replaceOnUseName] = [replaceOnUseQty, replaceOnUseCat];
        }
      }
    }
  }

  let editVer = { list, extra, nonFood };

  const shoppingList = new ShoppingList({
    ...meals,
    name: req.body.name,
    editVer,
    items: [list],
    author: req.user._id,
  });
  await shoppingList.save();

  req.flash("success", `Edit your shopping list items for: '${req.body.name}'`);
  res.redirect(`/shoppinglist/edit/${shoppingList.id}`);
};

export const edit = async (req, res) => {
  const { id } = req.params;
  let catUser = await Category.find({ author: req.user.id });
  let catArray = catUser[0].catList;

  const shopList = await ShoppingList.findById(id);

  const shopListEditVer = shopList.editVer;
  let current = {};
  let extra = {};
  let nonFood = {};
  let removed = {};
  if (shopListEditVer.list) {
    current = shopListEditVer.list;
  }
  if (shopListEditVer.extra) {
    extra = shopListEditVer.extra;
  }
  if (shopListEditVer.nonFood) {
    nonFood = shopListEditVer.nonFood;
  }
  if (shopListEditVer.removed) {
    removed = shopListEditVer.removed;
  }

  res.render("shoppinglist/editIngredients", {
    current,
    extra,
    nonFood,
    removed,
    catArray,
    id,
    title: `Edit ${shopList.name}`,
    js_page: "slEditIng",
    css_page: "slEditIng",
  });
};

export const createIngredients = async (req, res) => {
  const { id } = req.params;

  try {
    const list = {};
    if (req.body.list) {
      if (typeof req.body.list.ingredient !== "string") {
        for (let i = 0; i < req.body.list.ingredient.length; i++) {
          list[req.body.list.ingredient[i]] = [
            req.body.list.qty[i],
            req.body.list.cat[i],
          ];
        }
      } else {
        list[req.body.list.ingredient] = [req.body.list.qty, req.body.list.cat];
      }
    }
    const extra = {};
    if (req.body.extra) {
      if (typeof req.body.extra.ingredient !== "string") {
        for (let i = 0; i < req.body.extra.ingredient.length; i++) {
          extra[req.body.extra.ingredient[i]] = [
            req.body.extra.qty[i],
            req.body.extra.cat[i],
          ];
        }
      } else {
        extra[req.body.extra.ingredient] = [
          req.body.extra.qty,
          req.body.extra.cat,
        ];
      }
    }
    const nonFood = {};
    if (req.body.nonFood) {
      if (typeof req.body.nonFood.ingredient !== "string") {
        for (let i = 0; i < req.body.nonFood.ingredient.length; i++) {
          nonFood[req.body.nonFood.ingredient[i]] = [
            req.body.nonFood.qty[i],
            req.body.nonFood.cat[i],
          ];
        }
      } else {
        nonFood[req.body.nonFood.ingredient] = [
          req.body.nonFood.qty,
          req.body.nonFood.cat,
        ];
      }
    }
    const removed = {};
    if (req.body.removed) {
      if (typeof req.body.removed.ingredient !== "string") {
        for (let i = 0; i < req.body.removed.ingredient.length; i++) {
          removed[req.body.removed.ingredient[i]] = [
            req.body.removed.qty[i],
            req.body.removed.cat[i],
          ];
        }
      } else {
        removed[req.body.removed.ingredient] = [
          req.body.removed.qty,
          req.body.removed.cat,
        ];
      }
    }

    let editVer = { list, extra, nonFood, removed };

    let editedShoppingList = await ShoppingList.findByIdAndUpdate(id, {
      items: [list],
      editVer,
    });

    req.flash("success", `Succesfully updated '${editedShoppingList.name}'`);
    res.redirect(`/shoppinglist/${id}`);
  } catch (err) {
    req.flash("error", `${err.name}: Did you add any shopping list items?`);
    return res.redirect(`/shoppinglist/edit/${id}`);
  }
};

export const show = async (req, res) => {
  const { id } = req.params;

  const shoppingListFinal = await ShoppingList.findById(id)
    .populate("friday")
    .populate("saturday")
    .populate("sunday")
    .populate("monday")
    .populate("tuesday")
    .populate("wednesday")
    .populate("thursday")
    .populate("lunchWeekday")
    .populate("lunchWeekend")
    .populate("breakfast");

  let catUser = await Category.find({ author: req.user.id });
  let catArray = catUser[0].catList;

  let copyList;
  if (Object.keys(shoppingListFinal.items[0]).length !== 0) {
    copyList = copyListFunc(shoppingListFinal.items, catArray);
  } else {
    copyList = "Please re-edit your shoppinglist and submit your choosen items";
  }

  const allShoppingLists = await ShoppingList.find({ author: req.user._id });
  let allShoppingListIds = [];
  for (let i = 0; i < allShoppingLists.length; i++) {
    allShoppingListIds.push(allShoppingLists[i].id);
  }
  const showAllShoppingListIds = JSON.stringify(allShoppingListIds);

  res.render("shoppinglist/show", {
    showAllShoppingListIds,
    shoppingListFinal,
    copyList,
    catArray,
    title: `View ${shoppingListFinal.name}`,
    js_page: "slShow",
    css_page: "slShow",
  });
};

export const deleteShoppingList = async (req, res) => {
  const { id } = req.params;
  let deletedShoppingList = await ShoppingList.findByIdAndDelete(id);

  req.flash("success", `Succesfully deleted '${deletedShoppingList.name}'`);
  res.redirect("/shoppinglist");
};

export const defaultGet = async (req, res) => {
  const meals = await Meal.find({ author: req.user._id }).populate("author");
  meals.sort((a, b) => a.mealName.localeCompare(b.mealName));
  res.render("shoppinglist/default", {
    meals,
    title: "Change Daily Default Meals",
    css_page: "slDefault",
  });
};

export const defaultPatch = async (req, res) => {
  const defaults = req.body;

  await Meal.updateMany(
    { author: req.user._id },
    { $set: { default: "unAssig" } },
    { updatePipeline: true },
  );

  for (let d in defaults) {
    if (defaults[d] !== "none") {
      await Meal.findOneAndUpdate(
        { $and: [{ _id: defaults[d] }, { author: req.user._id }] },
        { $pull: { default: "unAssig" } },
      );
      await Meal.findOneAndUpdate(
        { $and: [{ _id: defaults[d] }, { author: req.user._id }] },
        { $push: { default: d } },
      );
    }
  }

  req.flash("success", `Succesfully updated your Default Meals!`);
  res.redirect("/shoppinglist/new");
};
