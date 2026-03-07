/* global mealNames, itemsArray */

const addedDiv = document.querySelector("#added");
const ing = document.querySelector("#ing");
const newIng = document.querySelector("#newIng");
const nameAlert = document.querySelector("#nameAlert");
const nameMsg = document.querySelector("#nameMsg");
const ingAlert = document.querySelector("#ingAlert");
const ingMsg = document.querySelector("#ingMsg");
const newIngAlert = document.querySelector("#newIngAlert");
const newIngMsg = document.querySelector("#newIngMsg");
const removeAlert = document.querySelector("#removeAlert");
const removeMsg = document.querySelector("#removeMsg");
const editMeal = document.querySelector("#editMeal");
const mealName = document.querySelector("#mealName");
const mealType = document.querySelector("#mealType");

// Checks for duplicate meal names in the same category
editMeal.addEventListener("submit", (e) => {
  let nameOfMeal = mealName.value;
  let typeOfMeal = mealType.value;
  for (let m = 0; m < Object.keys(mealNames).length; m++) {
    if (
      Object.keys(mealNames)[m] === nameOfMeal &&
      Object.values(mealNames)[m] === typeOfMeal
    ) {
      e.preventDefault();
      e.stopPropagation();
      nameMsg.innerText = `${nameOfMeal} is already a meal, please choose a different name`;
      nameAlert.classList.remove("alert-warning", "alert-success", "nameAlert");
      return nameAlert.classList.add("alert-warning");
    }
    editMeal.classList.add("was-validated");
  }
});

// Runs the showUser function on ing form submit
ing.addEventListener("submit", (e) => {
  // BootStap client side form validation
  if (ing.checkValidity() === false) {
    e.preventDefault();
    e.stopPropagation();
  } else {
    // Prevents the formAdd submitting normally
    e.preventDefault();

    // Removes any alerts not closed
    ingAlert.classList.add("ingAlert");
    newIngAlert.classList.add("newIngAlert");
    removeAlert.classList.add("removeAlert");
    nameAlert.classList.add("nameAlert");

    // Shows alert if user tries adding an ingredient already added.
    const ingredientName = document.querySelectorAll(".ingredientName");
    for (let v of ingredientName) {
      if (v.value == ing.ingredient.value) {
        // Adds alert if ingrdient has already been added
        ingMsg.innerText = `${ing.ingredient.value} is already an ingredient of the meal`;
        ingAlert.classList.remove("alert-warning", "alert-success", "ingAlert");
        return ingAlert.classList.add("alert-warning");
      }
    }

    // Cretes a div to hold the inputs and span
    let div = document.createElement("div");
    div.classList.add("userIng");
    // Creats span that tells user they can click to delete
    let icon = document.createElement("i");
    icon.classList.add("fas", "fa-trash-alt");

    // Creates new input for choosen ingredient
    let inputQty = document.createElement("input");
    inputQty.type = "number";
    inputQty.name = "ingredient[qty]";
    inputQty.classList.add("qty");
    inputQty.value = ing.qty.value;

    let inputIngredient = document.createElement("input");
    inputIngredient.type = "text";
    inputIngredient.name = "ingredient[name]";
    inputIngredient.classList.add("ingredientName");
    inputIngredient.value = ing.ingredient.value;
    inputIngredient.readOnly = true;

    let inputCat = document.createElement("input");
    inputCat.type = "hidden";
    inputCat.classList.add("cat");

    let inputAddTo = document.createElement("input");
    inputAddTo.type = "hidden";
    inputAddTo.name = "ingredient[addTo]";
    inputAddTo.value = ing.addTo.value;

    // Add required inputs for choose ingredient to div
    div.appendChild(inputQty);
    div.appendChild(inputIngredient);
    div.appendChild(inputCat);
    div.appendChild(inputAddTo);

    // Adds span to div
    div.appendChild(icon);

    // Adds div to form
    addedDiv.appendChild(div);

    // Adds alert if ingrdient has added
    ingMsg.innerText = `${ing.ingredient.value} added`;
    ingAlert.classList.remove("alert-warning", "alert-success", "ingAlert");
    ingAlert.classList.add("alert-success");
  }

  // BootStap client side form validation
  ing.classList.add("was-validated");
});

// Runs the showUserNew function on newIng form submit
newIng.addEventListener("submit", (e) => {
  // BootStap client side form validation
  if (newIng.checkValidity() === false) {
    e.preventDefault();
    e.stopPropagation();
    newIng.classList.add("was-validated");
  } else {
    // Prevents the formAdd submitting normally
    e.preventDefault();

    // removes any alerts not closed
    ingAlert.classList.add("ingAlert");
    newIngAlert.classList.add("newIngAlert");
    removeAlert.classList.add("removeAlert");
    nameAlert.classList.add("nameAlert");

    // Uppercases the first letter of each word of the name, trimming the white space at the end
    // Needs to be client side, as the are dynamically shown the new ingredient straight away
    let input = newIng.newIngredient.value.trim();
    input = input.split(" ");
    let newIngredientUpper = "";
    for (let i of input) {
      newIngredientUpper += i[0].toUpperCase() + i.slice(1, i.length) + " ";
    }
    newIngredientUpper = newIngredientUpper.trim();

    // Shows alert if user tries adding an ingredient already added.
    const ingredientName = document.querySelectorAll(".ingredientName");
    for (let v of ingredientName) {
      if (v.value === newIngredientUpper) {
        // Adds alert if ingrdient has already been added
        newIngMsg.innerText = `${newIngredientUpper} is already an ingredient of the meal`;
        newIngAlert.classList.remove(
          "alert-warning",
          "alert-success",
          "newIngAlert",
        );
        return newIngAlert.classList.add("alert-warning");
      }
    }

    // If ingredient already in the db, alert shows, otherwise ingredient added.
    if (!itemsArray.includes(newIngredientUpper)) {
      // Adds the input to the page so the user can see it
      // Cretes a div to hold the inputs and span
      let div = document.createElement("div");
      div.classList.add("userIng");
      // Creats span that tells user they can click to delete
      let icon = document.createElement("i");
      icon.classList.add("fas", "fa-trash-alt");

      // Creates new input for new ingrendiednt
      let inputNewQty = document.createElement("input");
      inputNewQty.type = "number";
      inputNewQty.name = "newIngredient[newQty]";
      inputNewQty.classList.add("qty");
      inputNewQty.value = newIng.newQty.value;

      let inputnewIngredient = document.createElement("input");
      inputnewIngredient.type = "text";
      inputnewIngredient.name = "newIngredient[name]";
      inputnewIngredient.classList.add("ingredientName");
      inputnewIngredient.value = newIngredientUpper;
      inputnewIngredient.readOnly = true;

      let inputNewCat = document.createElement("input");
      inputNewCat.type = "hidden";
      inputNewCat.name = "newIngredient[newCat]";
      inputNewCat.value = newIng.newCat.value;

      let inputNewAddTo = document.createElement("input");
      inputNewAddTo.type = "hidden";
      inputNewAddTo.name = "newIngredient[newAddTo]";
      inputNewAddTo.value = newIng.newAddTo.value;

      // Add required inputs for new ingredient to div
      div.appendChild(inputNewQty);
      div.appendChild(inputnewIngredient);
      div.appendChild(inputNewCat);
      div.appendChild(inputNewAddTo);
      // Adds span to div
      div.appendChild(icon);
      // Adds div to form
      addedDiv.appendChild(div);

      // Adds alert if ingrdient has added
      newIngMsg.innerText = `${newIngredientUpper} added`;
      newIngAlert.classList.remove(
        "alert-warning",
        "alert-success",
        "newIngAlert",
      );
      newIngAlert.classList.add("alert-success");

      // Removes input form name input
      newIng.newIngredient.value = "";
      // Remove BootStap client side form validation
      newIng.classList.remove("was-validated");
    } else {
      // Adds alert if ingrdient has already been added
      newIngMsg.innerText = `${newIngredientUpper} already a known ingredient, please select from the list of avaliable ingredients.`;
      newIngAlert.classList.remove(
        "alert-warning",
        "alert-success",
        "newIngAlert",
      );
      newIngAlert.classList.add("alert-warning");
    }
  }
});

// Removes an item if clicked on
addedDiv.addEventListener("click", function (e) {
  // Need to use e.target as the page is dynamic.
  // Removes parent node, which should always be the enclosing div,
  // this removes both inputs and the span.
  // If the the parent node is the original div with id added,
  // the remove does not happen
  if (e.target.className === "fas fa-trash-alt") {
    e.target.parentNode.remove();
    const name =
      e.target.previousElementSibling.previousElementSibling
        .previousElementSibling.value;

    // removes any alerts not closed
    ingAlert.classList.add("ingAlert");
    newIngAlert.classList.add("newIngAlert");
    removeAlert.classList.add("removeAlert");
    nameAlert.classList.add("nameAlert");

    // Adds alert if ingrdient has beedn removed
    removeMsg.innerText = `${name} removed`;
    removeAlert.classList.remove(
      "alert-warning",
      "alert-success",
      "removeAlert",
    );
    removeAlert.classList.add("alert-success");
  }
});

// event listerner to remove alert if clicked once shown
ingAlert.addEventListener("click", function () {
  ingAlert.classList.add("ingAlert");
});

// event listerner to remove alert if clicked once shown
newIngAlert.addEventListener("click", function () {
  newIngAlert.classList.add("newIngAlert");
});

// event listerner to remove alert if clicked once shown
removeAlert.addEventListener("click", function () {
  removeAlert.classList.add("removeAlert");
});

// event listerner to remove alert if clicked once shown
nameAlert.addEventListener("click", function () {
  nameAlert.classList.add("nameAlert");
});
