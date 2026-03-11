import Quiz from "../models/quiz.js";

const quizChecks = async (req, res, next) => {
  // Is a user with no userData going to an allowedPath path
  const allowedPathsNewUser = [
    "/",
    "/lobby-new",
    "/lobby-join",
    "/policy/cookie-policy",
    "/policy/tandc",
    "/api/logs",
  ];
  if (!res.locals.userData && !allowedPathsNewUser.includes(req.path)) {
    req.flash("success", "Please start or join a quiz.");
    return res.redirect("/");
  }

  // Is a user with userData going to an allowedPath path
  const allowedPathsCurrentUser = [
    "/reset-quiz",
    "/reset-user",
    "/quiz-kick-user",
    "/api/quizcode",
    "/api/start-quiz",
    "/api/submit-quiz",
    "/api/show-quiz",
    "/api/next-quiz",
    "/api/finished-quiz",
    "/policy/cookie-policy",
    "/policy/tandc",
    "/api/logs",
  ];
  const allowedQueries = ["kick", "dupe", "isQuizCode"];
  // Is a user with userData at the correct place in the current quiz
  if (
    res.locals.userData &&
    !allowedPathsCurrentUser.includes(req.path) &&
    !Object.keys(req.query).some((key) => allowedQueries.includes(key))
  ) {
    // Makes sure there is userData

    const userData = req.session.userData;
    const { userName, quizCode } = userData;
    const checkQuiz = await Quiz.findOne({ quizCode });

    // There is no quiz with the quizCode
    if (!checkQuiz) {
      req.session.userData = undefined;

      req.flash("error", "That Quiz does not exist or has been reset...");
      return res.redirect("/");
    }

    // The user is not in the Quiz
    if (!checkQuiz.users.some((user) => user.userName === userName)) {
      req.session.userData = undefined;
      req.flash("error", "You are not in this Quiz, please rejoin");
      return res.redirect("/?isJoin=false&quizCode=" + quizCode);
    }

    // Does progress match
    if (userData.progress !== checkQuiz.progress) {
      userData.progress = checkQuiz.progress;
    }

    // Do the questionNumbers match
    if (userData.questionNumber !== checkQuiz.questionNumber) {
      userData.questionNumber = checkQuiz.questionNumber;
    }

    // Send the user to the correct path
    if (req.path !== userData.progress) {
      req.flash(
        "error",
        "You ended up at the wrong place, but you are back now!",
      );
      return res.redirect(userData.progress);
    }
  }

  // Call the next middleware function
  next();
};

export { quizChecks };
