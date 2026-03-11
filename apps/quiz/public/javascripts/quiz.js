/* global socketInstance */
const multiOne = document.getElementById("multiOne");
const ansOne = document.getElementById("ansOne");
const labelOne = document.getElementById("labelOne");
const multiTwo = document.getElementById("multiTwo");
const ansTwo = document.getElementById("ansTwo");
const labelTwo = document.getElementById("labelTwo");
const multiThree = document.getElementById("multiThree");
const ansThree = document.getElementById("ansThree");
const labelThree = document.getElementById("labelThree");
const multiFour = document.getElementById("multiFour");
const ansFour = document.getElementById("ansFour");
const labelFour = document.getElementById("labelFour");
const submitBtn = document.getElementById("submitBtn");
const showBtn = document.getElementById("showBtn");
const nextBtn = document.getElementById("nextBtn");
const submittedUl = document.getElementById("submittedUl");
const correctAns = document.getElementById("correctAns");
const correctAnsDiv = document.getElementById("correctAnsDiv");

// Update if disconnected variables
const quizProgress = userData.quizProgress;
const questionNumber = userData.questionNumber;
let numOfLis = usersSubmitted.length;
let showAnsTimer = 5;
let nextQuestTimer = 10;

// Setting up the Quiz
// Create the 4 answers for the question
let answersArray = [];
for (a of questions[userData.questionNumber - 1].incorrectAnswers) {
  answersArray.push(a);
}
answersArray.push(questions[userData.questionNumber - 1].correctAnswer);
// Shuffle the answersArray
for (let i = answersArray.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [answersArray[i], answersArray[j]] = [answersArray[j], answersArray[i]];
}
// Add the shuffled answers to the multiOne to multiFour elements
// Change the id of the checkboxes to the answers
// Change the for attribute of the labels to the answers
multiOne.textContent = answersArray[0];
ansOne.id = answersArray[0];
labelOne.setAttribute("for", answersArray[0]);
multiTwo.textContent = answersArray[1];
ansTwo.id = answersArray[1];
labelTwo.setAttribute("for", answersArray[1]);
multiThree.textContent = answersArray[2];
ansThree.id = answersArray[2];
labelThree.setAttribute("for", answersArray[2]);
multiFour.textContent = answersArray[3];
ansFour.id = answersArray[3];
labelFour.setAttribute("for", answersArray[3]);

// Only allows one check box to be checked at a time
const boxes = document.querySelectorAll('input[name="answer"]');
boxes.forEach((box) => {
  box.addEventListener("click", () => {
    boxes.forEach((b) => {
      if (b !== box) {
        if (b.checked) {
          b.checked = false;
        }
      }
    });
  });
});

// Putting the question back to answered if the user disconnected
const answered = () => {
  // Disabling the submit button
  submitBtn.disabled = true;
  // Select the user's checked answer
  const boxes = document.querySelectorAll('input[name="answer"]');
  boxes.forEach((box) => {
    if (box.id == userData.answers[questionNumber - 1]) {
      box.checked = true;
    } else {
      box.nextElementSibling.style.opacity = "0.5";
    }
    box.disabled = true;
  });
};

// Only show the showBtn button to the quizMaster if
// all users have answered the question
const checkAllSubmitted = () => {
  if (userData.quizMaster == true) {
    if (numOfLis == users.length) {
      showBtn.style.display = "block";
      // If auto is true show the answer in 5 seconds
      if (userData.auto === true) {
        const timer = setInterval(() => {
          showBtn.innerText = `Show Answer (${showAnsTimer})`;
          // Timer, set at the start of js
          showAnsTimer--;
          if (showAnsTimer < 0) {
            clearInterval(timer);
            showAnswer();
          }
        }, 1000);
      }
    }
  }
};

// Submits the user's answer to the api and disables the question
const submitAnswer = () => {
  // Check if the user has selected an answer
  const checkedBoxes = document.querySelectorAll(
    'input[name="answer"]:checked',
  );
  if (checkedBoxes.length === 0) {
    return alert("You need to select an answer");
  }
  // Get the users answer
  let answer = document.querySelector('input[name="answer"]:checked').id;
  // Check if the answer is correct and update score
  // 1 for correct, 0 for incorrect
  let correctAnswer = questions[userData.questionNumber - 1].correctAnswer;
  let score;
  if (answer === correctAnswer) {
    score = 1;
  } else {
    score = 0;
  }
  // Data to send to the api
  let userDataToSubmit = {
    score: score,
    answer: answer,
  };
  // Send submitData to /api/submit-quiz
  fetch("/api/submit-quiz", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(userDataToSubmit),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message == "success") {
        submitBtn.disabled = true;
        const boxes = document.querySelectorAll('input[name="answer"]');
        boxes.forEach((box) => {
          box.disabled = true;
          if (box.checked == false) {
            box.nextElementSibling.style.opacity = "0.5";
          }
        });
      }
    })
    .catch((error) => console.error("Error:", error));
};

// Shows the answer to the users
const showAnswer = () => {
  // Update userData.quizProgress to 'waiting'
  fetch("/api/show-quiz", {
    method: "GET",
    credentials: "include",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message == "success") {
        nextBtnShow();
      }
    })
    .catch((error) => console.error("Error:", error));
};

// Shows the answer and runs timer from next button
const nextBtnShow = () => {
  // Get Correct Answer
  let correctAnswer = questions[userData.questionNumber - 1].correctAnswer;
  // Show the correct answer
  correctAns.textContent = correctAnswer;
  correctAnsDiv.style.display = "block";
  // Hides the show button
  showBtn.style.display = "none";
  // Shows the next button but only for the quizMaster
  if (userData.quizMaster === true) {
    nextBtn.style.display = "block";
    // If auto is true show the answer in 10 seconds
    if (userData.auto === true) {
      // The timer - auto runs nextQuestion()
      const timer = setInterval(() => {
        // If last question this button is changed
        if (questionNumber === questions.length) {
          nextBtn.classList.remove("btn-primary");
          nextBtn.classList.add("btn-danger");
          nextBtn.innerText = `Finish Quiz (${nextQuestTimer})`;
        } else {
          nextBtn.innerText = `Next Question (${nextQuestTimer})`;
        }
        //Timer, set at the start of js
        nextQuestTimer--;
        if (nextQuestTimer < 0) {
          clearInterval(timer);
          nextQuestion();
        }
      }, 1000);
    }
  }
};

// Progresses to the next question
const nextQuestion = () => {
  fetch("/api/next-quiz", {
    method: "GET",
    credentials: "include",
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message == "success") {
        window.location.replace("/quiz");
      }
    })
    .catch((error) => console.error("Error:", error));
};

// If statements to re-connect disconnected users
if (quizProgress === "answered") {
  answered();
  checkAllSubmitted();
}
if (quizProgress === "waiting") {
  answered();
  nextBtnShow();
}

// Button event listeners
submitBtn.addEventListener("click", function (e) {
  e.preventDefault();
  e.stopPropagation();
  submitAnswer();
});
showBtn.addEventListener("click", function (e) {
  e.preventDefault();
  e.stopPropagation();
  showAnswer();
});
nextBtn.addEventListener("click", function (e) {
  e.preventDefault();
  e.stopPropagation();
  nextQuestion();
});

// Recieve submit socket emit from /api/submit-quiz
socketInstance.on("submit", (userName) => {
  // add userName to submittedUl
  let li = document.createElement("li");
  li.classList.add("list-group-item");
  li.id = userName;
  li.textContent = userName;
  submittedUl.append(li);
  // Update numOfLis to show nextBtn if all users have submitted
  numOfLis++;
  checkAllSubmitted();
});

// Runs showAnswer() for all users apart from quizMaster
socketInstance.on("show", () => {
  if (userData.quizMaster !== true) {
    showAnswer();
  }
});

// Recieve next socket emit from /api/next-quiz
socketInstance.on("next", () => {
  if (userData.quizMaster != true) {
    nextQuestion();
  }
});

// Removes the user from the submitted list (if there)
socketInstance.on("resetUser", (quizCode, userName) => {
  if (quizCode === userData.quizCode) {
    // Remove userName from submittedUl
    const userRemove = document.getElementById(userName);
    // Stoips promise error if the userName is not in the sumittedUl
    if (userRemove) {
      userRemove.remove();
    }
    // Removes the user from the kick users list
    const usersToKick = document.getElementById("usersToKick");
    const options = usersToKick.options;
    // Loops through all options to find the userName and remove it
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === userName) {
        usersToKick.remove(i);
        break; // Option is found and removed, so exit the loop
      }
    }
    // update numOfLis to show nextBtn if all users have submitted
    numOfLis--;
    checkAllSubmitted();
  }
});

// Reloads the kicked users page, which re-directs them to '/'
socketInstance.on("kickedUser", (userName) => {
  if (userData.userName === userName) {
    window.location.replace("/?kick=true");
  }
});
