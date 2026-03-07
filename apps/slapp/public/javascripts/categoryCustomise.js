/* global Sortable */

const orderCategories = document.querySelector("#orderCategories");

// Check if Sortable is available
if (typeof Sortable !== "undefined") {
  Sortable.create(orderCategories, {
    group: "sorting",
    animation: 150,
    ghostClass: "blue-background-class",
    sort: true,
  });
}

let info = document.querySelector("#info");

info.addEventListener("submit", () => {
  const cat = document.querySelectorAll(".cat");

  for (let i = 0; i < cat.length; i++) {
    let obj = {};
    obj[cat[i].name] = cat[i].value;
    let field = document.createElement("input");
    field.type = "hidden";
    field.name = cat[i].value;
    info.appendChild(field);
    field.value = cat[i].name;
  }
});
