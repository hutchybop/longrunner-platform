const copybtn = document.querySelector("#copybtn");

function copyToClip() {
  // Displays the text input for copying
  copybtn.style.display = "block";

  // Select the text field
  copybtn.select();
  copybtn.setSelectionRange(0, 99999); // For mobile devices

  /* global shoppingListFinal, showAllShoppingListIds */

  // Copy the text inside the text field
  window.navigator.clipboard.writeText(copybtn.value).then(function () {
    window.alert("Copied to clipboard");
  });

  copybtn.style.display = "none";
}

const copyToClipBtn = document.querySelector("#copyToClipBtn");
copyToClipBtn.addEventListener("click", function (e) {
  e.preventDefault();
  e.stopPropagation();
  copyToClip();
});

document.addEventListener("DOMContentLoaded", function () {
  const br = document.querySelectorAll("br");
  for (let x of br) {
    if (x.nextElementSibling && x.nextElementSibling.outerHTML === "<br>") {
      x.remove();
    }
  }
});

// Retrieving previously checked items from local storage
// and adding to checked values
let checkedItems = {};
let all = document.getElementsByTagName("input");
let prevCheckedItems = JSON.parse(localStorage.getItem(shoppingListFinal));
if (prevCheckedItems !== null) {
  for (let i = 0; i < all.length; i++) {
    if (all[i].type === "checkbox") {
      let prevCheckedItemsKey = all[i].id;
      let isChecked = prevCheckedItems[prevCheckedItemsKey];
      all[i].checked = isChecked;
    }
  }
}

// Adding newly checked items to local storage
for (let i = 0; i < all.length; i++) {
  if (all[i].type === "checkbox") {
    let checkedItemsKey = all[i].id;
    let checkedItemsValue = all[i].checked;
    checkedItems[checkedItemsKey] = checkedItemsValue;
    all[i].addEventListener("change", function () {
      checkedItemsKey = all[i].id;
      checkedItemsValue = all[i].checked;
      checkedItems[checkedItemsKey] = checkedItemsValue;
      localStorage.setItem(shoppingListFinal, JSON.stringify(checkedItems));
    });
  }
}

// Removes localstorage items if the list has been deleted
let currentLocalStorage = { ...localStorage };
for (let i in currentLocalStorage) {
  if (i !== "hasVisited" && !showAllShoppingListIds.includes(i)) {
    localStorage.removeItem(i);
  }
}

let slShowAlertDelete = document.getElementById("slShowAlertDelete");
slShowAlertDelete.onsubmit = () => {
  if (!window.confirm("Do you really want to delete this Shopping List?")) {
    return false;
  }
  this.form.submit();
};
