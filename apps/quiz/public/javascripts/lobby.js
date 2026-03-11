/* global socketInstance */
const userList = document.querySelector("#userList");
const startBtn = document.querySelector("#startBtn");

// Listen for the 'userUpdated' event
socketInstance.on("userJoined", (userNameJoin) => {
  const newUserItem = document.createElement("li");
  newUserItem.className = "list-group-item";
  newUserItem.id = userNameJoin;
  newUserItem.textContent = userNameJoin;
  userList.appendChild(newUserItem);
});

// Listen for resetUser event from reset-user route
socketInstance.on("resetUser", (quizCode, userName) => {
  if (quizCode == userData.quizCode) {
    const userRemove = document.getElementById(userName);
    userRemove.remove();
  }
});

if (userData.quizMaster === true) {
  startBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    // Sends an AJAX request to the server to start the quiz
    fetch("/api/start-quiz", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(userData),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message == "success") {
          window.location.replace("/quiz");
        }
      })
      .catch((error) => console.error("Error:", error));
  });
}

socketInstance.on("start", (quizCode) => {
  if (quizCode == userData.quizCode && userData.quizMaster == false) {
    fetch("/api/start-quiz", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(userData),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message == "success") {
          window.location.replace("/quiz");
        }
      })
      .catch((error) => console.error("Error:", error));
  }
});
