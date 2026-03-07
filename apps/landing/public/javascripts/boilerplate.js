// Cookie alert - for first time visits
// User has to clear the alert for it not to show on every page
const cookieAlert = document.getElementById("cookieAlert");
const cookieAlertBtn = document.getElementById("cookieAlertBtn");
cookieAlertBtn.addEventListener("click", () => {
  localStorage.setItem("hasVisited", "true");
});
let cookieAlertCheck = localStorage.getItem("hasVisited");
if (!cookieAlertCheck) {
  cookieAlert.style.display = "block";
} else {
  cookieAlert.style.display = "none";
}
