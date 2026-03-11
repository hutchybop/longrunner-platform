// Setup io.socket
const socketInstance = io();

// listens for reconnects, then reloads the window on reconnect
socketInstance.on("reconnect", (attemptNumber) => {
  console.log(
    "Reconnected to the io.socket server after",
    attemptNumber,
    "attempt(s)",
  );
  // Reload the page on reconnect
  window.location.reload();
});

// ResetQuiz emitted from quiz controller reset-quiz route
socketInstance.on("resetQuiz", (quizCode) => {
  let userQuizCode = "";
  // Sends an AJAX request to the server to retrieve the users current quizCode.
  fetch("/api/quizcode", {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => response.json())
    .then((data) => {
      // If the user's quizCode (data.message) is the same as
      // The quizCode from the reset io.socket (sent from /reset-quiz)
      // It reloads the window and redirects the user to / where userData is wiped
      // This happens either at / or quizChecks middleware
      userQuizCode = data.message;
      if (userQuizCode == quizCode) {
        window.location.replace("/?isResetQuiz=true");
      }
    })
    .catch((error) => console.error("Error fetching user data:", error));
});
