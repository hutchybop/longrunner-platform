document.addEventListener("DOMContentLoaded", function () {
  const deleteForms = document.querySelectorAll('[id^="slIndexAlertDelete"]');
  deleteForms.forEach((form) => {
    form.addEventListener("submit", function (e) {
      if (!window.confirm("Do you really want to delete this Shopping List?")) {
        e.preventDefault();
        return false;
      }
    });
  });
});
