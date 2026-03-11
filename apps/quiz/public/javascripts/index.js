const newBtn = document.querySelector("#newBtn");
const joinBtn = document.querySelector("#joinBtn");
const showNewQuiz = document.querySelector("#showNewQuiz");
const showJoinQuiz = document.querySelector("#showJoinQuiz");
const quizCodeInput = document.querySelector("#quizCodeInput");
const cancelBtnNew = document.querySelector("#cancelBtnNew");
const cancelBtnJoin = document.querySelector("#cancelBtnJoin");

// Shows userName input for a new Quiz
newBtn.addEventListener("click", function (e) {
  e.preventDefault();
  e.stopPropagation();
  newBtn.style.display = "none";
  joinBtn.style.display = "none";
  showNewQuiz.style.display = "block";
});

// Shows quiz code and userName inputs
joinBtn.addEventListener("click", function (e) {
  e.preventDefault();
  e.stopPropagation();
  newBtn.style.display = "none";
  joinBtn.style.display = "none";
  showJoinQuiz.style.display = "block";
});

// Cancels the input and resets the page
const cancelFunc = () => {
  newBtn.style.display = "block";
  joinBtn.style.display = "block";
  showNewQuiz.style.display = "none";
  showJoinQuiz.style.display = "none";
};
cancelBtnNew.addEventListener("click", function (e) {
  e.preventDefault();
  e.stopPropagation();
  cancelFunc();
});
cancelBtnJoin.addEventListener("click", function (e) {
  e.preventDefault();
  e.stopPropagation();
  cancelFunc();
});

// If a duplicate name has been chosen, the dupe flash warning will be shown to the user
// The local storage will also be cleared.
if (isQuizCode) {
  joinFunc();
}
if (isDupe || isJoin) {
  joinFunc();
  quizCodeInput.value = quizCode;
}
