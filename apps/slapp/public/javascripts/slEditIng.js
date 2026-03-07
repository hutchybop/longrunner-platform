const list = document.querySelector("#list");
const add = document.querySelector("#add");
const nonFoodList = document.querySelector("#nonFood");
const deleted = document.querySelector("#deleted");
const addItem = document.querySelector("#addItem");

// Queries for Bootstrap alert
const listAlert = document.querySelector("#listAlert");
const listMsg = document.querySelector("#listMsg");
const addAlert = document.querySelector("#addAlert");
const addMsg = document.querySelector("#addMsg");
const nonFoodAlert = document.querySelector("#nonFoodAlert");
const nonFoodMsg = document.querySelector("#nonFoodMsg");
const deletedItemAlert = document.querySelector("#deletedItemAlert");
const deletedItemMsg = document.querySelector("#deletedItemMsg");
const addItemAlert = document.querySelector("#addItemAlert");
const addItemMsg = document.querySelector("#addItemMsg");

// Removes the clicked item from list and adds to removed
list.addEventListener("click", function (e) {
  // Need to use e.target as the page is dynamic.
  if (e.target.className === "fas fa-trash-alt") {
    //removes any alerts not closed
    listAlert.classList.add("moveAlert");
    addAlert.classList.add("moveAlert");
    nonFoodAlert.classList.add("moveAlert");
    deletedItemAlert.classList.add("moveAlert");
    addItemAlert.classList.add("moveAlert");

    // Changes the innerText of the span
    // Moves the selected item to the add list
    let toBeRemoved = e.target.parentNode;
    toBeRemoved.lastElementChild.classList.remove("fa-trash-alt");
    toBeRemoved.lastElementChild.classList.add("fa-plus");

    //loops through toBeAdded.childNodes and changes the relevant names
    for (let i = 0; i < toBeRemoved.childNodes.length; i++) {
      if (toBeRemoved.childNodes[i].name == "list[ingredient]") {
        toBeRemoved.childNodes[i].name = "removed[ingredient]";
      } else if (toBeRemoved.childNodes[i].name == "list[qty]") {
        toBeRemoved.childNodes[i].name = "removed[qty]";
      } else if (toBeRemoved.childNodes[i].name == "list[cat]") {
        toBeRemoved.childNodes[i].name = "removed[cat]";
      }
    }

    deleted.appendChild(toBeRemoved);

    // Adds alert if ingrdient has added
    const name = e.target.previousElementSibling.previousElementSibling.value;
    listMsg.innerText = `${name} removed`;
    listAlert.classList.remove("alert-warning", "alert-success", "moveAlert");
    listAlert.classList.add("alert-warning");
  }
});

// Moves the item from clicked from extra to list
add.addEventListener("click", function (e) {
  // Need to use e.target as the page is dynamic.
  // Changes the innerText of the span
  // Moves the selected item to the shoppinglist
  if (e.target.className === "fas fa-plus") {
    //removes any alerts not closed
    listAlert.classList.add("moveAlert");
    addAlert.classList.add("moveAlert");
    nonFoodAlert.classList.add("moveAlert");
    deletedItemAlert.classList.add("moveAlert");
    addItemAlert.classList.add("moveAlert");

    let toBeAdded = e.target.parentNode;
    toBeAdded.lastElementChild.classList.remove("fa-plus");
    toBeAdded.lastElementChild.classList.add("fa-trash-alt");

    //loops through toBeAdded.childNodes and changes the relevant names
    for (let i = 0; i < toBeAdded.childNodes.length; i++) {
      if (toBeAdded.childNodes[i].name == "extra[ingredient]") {
        toBeAdded.childNodes[i].name = "list[ingredient]";
      } else if (toBeAdded.childNodes[i].name == "extra[qty]") {
        toBeAdded.childNodes[i].name = "list[qty]";
      } else if (toBeAdded.childNodes[i].name == "extra[cat]") {
        toBeAdded.childNodes[i].name = "list[cat]";
      }
    }

    list.appendChild(toBeAdded);

    // Adds alert if ingrdient has added
    const name = e.target.previousElementSibling.previousElementSibling.value;
    addMsg.innerText = `${name} added`;
    addAlert.classList.remove("alert-warning", "alert-success", "moveAlert");
    addAlert.classList.add("alert-success");
  }
});

// Moves the item clicked from nonFood to list
nonFoodList.addEventListener("click", function (e) {
  // Need to use e.target as the page is dynamic.
  // Changes the innerText of the span
  // Moves the selected item to the shoppinglist
  if (e.target.className === "fas fa-plus") {
    //removes any alerts not closed
    listAlert.classList.add("moveAlert");
    addAlert.classList.add("moveAlert");
    nonFoodAlert.classList.add("moveAlert");
    deletedItemAlert.classList.add("moveAlert");
    addItemAlert.classList.add("moveAlert");

    let toBeAdded = e.target.parentNode;
    toBeAdded.lastElementChild.classList.remove("fa-plus");
    toBeAdded.lastElementChild.classList.add("fa-trash-alt");

    //loops through toBeAdded.childNodes and changes the relevant names
    for (let i = 0; i < toBeAdded.childNodes.length; i++) {
      if (toBeAdded.childNodes[i].name == "nonFood[ingredient]") {
        toBeAdded.childNodes[i].name = "list[ingredient]";
      } else if (toBeAdded.childNodes[i].name == "nonFood[qty]") {
        toBeAdded.childNodes[i].name = "list[qty]";
      } else if (toBeAdded.childNodes[i].name == "nonFood[cat]") {
        toBeAdded.childNodes[i].name = "list[cat]";
      }
    }

    list.appendChild(toBeAdded);

    // Adds alert if ingrdient has added
    const name = e.target.previousElementSibling.previousElementSibling.value;
    nonFoodMsg.innerText = `${name} added`;
    nonFoodAlert.classList.remove(
      "alert-warning",
      "alert-success",
      "moveAlert",
    );
    nonFoodAlert.classList.add("alert-success");
  }
});

// Re-adds the clicked item from removed to list
deleted.addEventListener("click", function (e) {
  // Need to use e.target as the page is dynamic.
  if (e.target.className === "fas fa-plus") {
    //removes any alerts not closed
    listAlert.classList.add("moveAlert");
    addAlert.classList.add("moveAlert");
    nonFoodAlert.classList.add("moveAlert");
    deletedItemAlert.classList.add("moveAlert");
    addItemAlert.classList.add("moveAlert");

    // Changes the innerText of the span
    // Moves the selected item to the add list
    let toBeReadded = e.target.parentNode;
    toBeReadded.lastElementChild.classList.remove("fa-plus");
    toBeReadded.lastElementChild.classList.add("fa-trash-alt");

    //loops through toBeAdded.childNodes and changes the relevant names
    for (let i = 0; i < toBeReadded.childNodes.length; i++) {
      if (toBeReadded.childNodes[i].name == "removed[ingredient]") {
        toBeReadded.childNodes[i].name = "list[ingredient]";
      } else if (toBeReadded.childNodes[i].name == "removed[qty]") {
        toBeReadded.childNodes[i].name = "list[qty]";
      } else if (toBeReadded.childNodes[i].name == "removed[cat]") {
        toBeReadded.childNodes[i].name = "list[cat]";
      }
    }

    list.appendChild(toBeReadded);

    // Adds alert if ingredient has added
    const name = e.target.previousElementSibling.previousElementSibling.value;
    deletedItemMsg.innerText = `${name} readded`;
    deletedItemAlert.classList.remove(
      "alert-warning",
      "alert-success",
      "moveAlert",
    );
    deletedItemAlert.classList.add("alert-success");
  }
});

// Add additional item to list
addItem.addEventListener("submit", function (e) {
  // BootStap client side form validation
  if (addItem.checkValidity() === false) {
    e.preventDefault();
    e.stopPropagation();
    addItem.classList.add("was-validated");
  } else {
    // stops the page refreshing if submit is clicked
    e.preventDefault();

    //removes any alerts not closed
    listAlert.classList.add("moveAlert");
    addAlert.classList.add("moveAlert");
    nonFoodAlert.classList.add("moveAlert");
    deletedItemAlert.classList.add("moveAlert");
    addItemAlert.classList.add("moveAlert");

    // Uppercases the first letter of each word of the name, trimming the white space at the end
    let input = addItem.itemName.value.trim();
    input = input.split(" ");
    let addItemUpper = "";
    for (let i of input) {
      addItemUpper += i[0].toUpperCase() + i.slice(1, i.length) + " ";
    }
    addItemUpper = addItemUpper.trim();

    // Cretes a div to hold the inputs and span
    let div = document.createElement("div");
    div.classList.add("userIng");
    // Creats span that tells user they can click to delete
    let icon = document.createElement("i");
    icon.classList.add("fas", "fa-trash-alt");

    // Creates new input for choosen iitem
    let inputQty = document.createElement("input");
    inputQty.type = "number";
    inputQty.name = "list[qty]";
    inputQty.classList.add("qty");
    inputQty.value = addItem.itemQty.value;

    let inputItem = document.createElement("input");
    inputItem.type = "text";
    inputItem.name = "list[ingredient]";
    inputItem.classList.add("ingredientName");
    inputItem.value = addItemUpper;
    inputItem.readOnly = true;

    let inputCat = document.createElement("input");
    inputCat.type = "hidden";
    inputCat.name = "list[cat]";
    inputCat.value = addItem.itemCat.value;

    // Add required inputs for choose ingredient to div
    div.appendChild(inputQty);
    div.appendChild(inputItem);
    div.appendChild(inputCat);

    // Adds span to div
    div.appendChild(icon);

    // Adds div to form
    list.appendChild(div);

    // Adds alert if ingrdient has added
    addItemMsg.innerText = `${addItemUpper} added`;
    addItemAlert.classList.remove(
      "alert-warning",
      "alert-success",
      "moveAlert",
    );
    addItemAlert.classList.add("alert-success");

    // Removes input form name input
    addItem.itemName.value = "";
    // Remove BootStap client side form validation
    addItem.classList.remove("was-validated");
  }
});

// event listerner to remove alert if clicked once shown
listAlert.addEventListener("click", function () {
  listAlert.classList.add("moveAlert");
});

// event listerner to remove alert if clicked once shown
addAlert.addEventListener("click", function () {
  addAlert.classList.add("moveAlert");
});

// event listerner to remove alert if clicked once shown
nonFoodAlert.addEventListener("click", function () {
  nonFoodAlert.classList.add("moveAlert");
});

// event listerner to remove alert if clicked once shown
deletedItemAlert.addEventListener("click", function () {
  deletedItemAlert.classList.add("moveAlert");
});

// event listerner to remove alert if clicked once shown
addItemAlert.addEventListener("click", function () {
  addItemAlert.classList.add("moveAlert");
});
