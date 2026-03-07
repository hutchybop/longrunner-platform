let ingEditAlertDelete = document.getElementById("ingEditAlertDelete");
ingEditAlertDelete.onsubmit = () => {
  if (!window.confirm("Do you really want to delete this Ingredient?")) {
    return false;
  }
  this.form.submit();
};
