import Quiz from "../models/quiz.js";
import Question from "../models/question.js";
import getComment from "../utils/comments.js";
import axios from "axios";

// GET - index
export const index = (req, res) => {
  // Uses the queryParam from lobbyPOST
  const isQuizCode = req.query.isQuizCode;
  const isDupe = req.query.isDupe;
  const quizCode = req.query.quizCode;
  const isJoin = req.query.isJoin;
  const isResetQuiz = req.query.isResetQuiz;

  const kick = req.query.kick;

  if (isResetQuiz) {
    req.session.userData = undefined;
    req.flash("error", "The quiz has been reset...");
    return res.redirect("/");
  }

  if (kick) {
    req.session.userData = undefined;
    req.query.kick = undefined;
    req.flash("error", "You have been kicked from the Quiz!");
    return res.redirect("/");
  }

  res.render("quiz/index", {
    isQuizCode,
    isDupe,
    quizCode,
    isJoin,
    title: "Start Your Quiz",
    css_page: "index",
    js_page: "index",
  });
};

// POST - lobby-new
export const lobbyNewPost = async (req, res) => {
  const { diff, auto } = req.body;
  const amount = req.body.amount || 10;
  const userNameNew = req.body.userNameNew;
  let setAuto;

  // Function to create a random 4-digit quiz code
  const generateQuizCode = () => {
    const numbers = "0123456789";
    let quizCode = "";
    for (let i = 0; i < 4; i++) {
      quizCode += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return quizCode;
  };

  // Function to check the quizCode is unique
  const createUniqueQuizCode = async () => {
    let isUnique = false;
    let quizCode = "";

    while (!isUnique) {
      quizCode = generateQuizCode();
      const existingQuiz = await Quiz.findOne({ quizCode });
      if (!existingQuiz) {
        isUnique = true;
      }
    }

    return quizCode;
  };

  // Checks if auto is defined
  if (auto) {
    setAuto = true;
  } else {
    setAuto = false;
  }

  // Runs the function to get a unique quizCode
  const quizCode = await createUniqueQuizCode();

  // Defining common setup variables to make sure Quiz and userData are the same
  const setUserNameNew = userNameNew;
  const setQuizCode = quizCode;
  const setProgress = "/lobby";
  const setQuestionNumber = 0;

  // Add userData to session-data
  req.session.userData = {
    userName: setUserNameNew,
    quizCode: setQuizCode,
    progress: setProgress,
    quizProgress: "na",
    questionNumber: setQuestionNumber,
    answers: [],
    quizMaster: true,
    auto: setAuto,
  };

  // Creates a new quiz with the 4-digit code
  const newQuiz = new Quiz({
    quizCode: setQuizCode,
    quizMaster: setUserNameNew,
    users: [{ userName: setUserNameNew, score: 0 }],
    progress: setProgress,
    questionNumber: setQuestionNumber,
  });
  await newQuiz.save();

  // Add the rquired amount of questions to the Question collection in the db
  // Then adds each question to the new Quiz
  // Times run depends on the amount of questions desired, eg 20 questions, run 2 times
  for (let i = 1; i <= amount / 10; i++) {
    const questions = await axios.get(
      "https://the-trivia-api.com/v2/questions?difficulties=" + diff,
    );

    for (let q of questions.data) {
      let newQuestion = new Question({
        category: q.category,
        correctAnswer: q.correctAnswer,
        incorrectAnswers: q.incorrectAnswers,
        question: q.question.text,
        difficulty: q.difficulty,
      });
      await newQuestion.save();
      newQuiz.questions.push(newQuestion._id);
      await newQuiz.save();
    }
  }

  req.flash(
    "success",
    "<strong>Quiz Created</strong><br>Give the Quiz Code to your friends so they can join...",
  );
  res.redirect("/lobby");
};

// POST - lobby-join
export const lobbyJoinPost = async (req, res) => {
  const userQuizCode = req.body.quizCode;
  let userNameJoin = req.body.userNameJoin;

  const findQuiz = await Quiz.findOne({ quizCode: userQuizCode });

  if (!findQuiz) {
    req.flash("error", "Quiz Code: " + userQuizCode + ". Does not exist!");
    return res.redirect("/?isQuizCode=false&quizCode=" + userQuizCode); // There is no quiz with the quizCode
  }
  if (findQuiz.users.some((user) => user.userName === userNameJoin)) {
    req.flash("error", "That Username is already in use!");
    return res.redirect("/?isDupe=true&quizCode=" + userQuizCode); // The username has already been taken
  }

  // Add userData to session-data
  req.session.userData = {
    userName: userNameJoin,
    quizCode: userQuizCode,
    progress: "/lobby",
    quizProgress: "na",
    questionNumber: 0,
    answers: [],
    quizMaster: false,
  };

  // Adds the user to the quiz
  findQuiz.users.push({ userName: userNameJoin, score: 0 }); // Add user to users array
  await findQuiz.save();

  // emits that a user has joined to lobby.ejs
  req.io.emit("userJoined", userNameJoin);

  req.flash(
    "success",
    "Give the Quiz Code to your friends so they can join...",
  );
  res.redirect("/lobby");
};

// LOBBY - lobby (GET)
export const lobby = async (req, res) => {
  let userData = res.locals.userData;

  const checkQuiz = await Quiz.findOne({ quizCode: userData.quizCode });

  let userList = checkQuiz.users;
  const quizMaster = checkQuiz.quizMaster;
  const quizCode = checkQuiz.quizCode;

  res.render("quiz/lobby", {
    userList,
    quizMaster,
    quizCode,
    userData,
    title: "Lobby",
    css_page: "lobby",
    js_page: "lobby",
  });
};

// GET - Quiz
export const quiz = async (req, res) => {
  let userData = res.locals.userData;
  const checkQuiz = await Quiz.findOne({
    quizCode: userData.quizCode,
  }).populate({ path: "questions" });

  const questions = checkQuiz.questions;
  const usersSubmitted = checkQuiz.usersSubmitted;
  const users = checkQuiz.users;

  // Emits the start signal picked up in lobby.ejs
  if (userData.quizMaster === true) {
    req.io.emit("start", userData.quizCode);
  }

  if (userData.questionNumber > questions.length) {
    const quizMaster = userData.quizMaster;

    if (quizMaster === true) {
      await Quiz.findOneAndUpdate(
        { quizCode: userData.quizCode },
        { $set: { usersSubmitted: [], progress: "/finish" } },
      );
    }

    req.session.userData.progress = "/finish";
    req.session.userData.quizProgress = "na";

    return res.redirect("/finish");
  }

  res.render("quiz/quiz", {
    questions,
    userData,
    usersSubmitted,
    users,
    title: "Quiz",
    css_page: "quiz",
    js_page: "quiz",
  });
};

// GET - finish
export const finish = async (req, res) => {
  const userData = res.locals.userData;

  // Sends the users array from Quiz to finish.ejs
  const quiz = await Quiz.findOne({ quizCode: userData.quizCode });
  const users = quiz.users;
  const numOfQuestions = quiz.questions.length;

  let userScores = [];

  for (let u of users) {
    let userScore = (u.score / numOfQuestions) * 100;
    let comment = getComment(userScore);

    let score = {
      userName: u.userName,
      userScore: userScore,
      userComment: comment,
    };

    userScores.push(score);
  }

  res.render("quiz/finish", {
    userScores,
    title: "How did you do?",
    css_page: "finish",
  });
};

// PATCH - /quiz-kick-user
export const quizKickUserPatch = async (req, res) => {
  const userNameKicked = req.body.kickUser;
  const userData = res.locals.userData;

  await Quiz.updateOne(
    { quizCode: userData.quizCode },
    {
      $pull: {
        users: { userName: userNameKicked },
        usersSubmitted: userNameKicked,
      },
    },
  );

  req.io.emit("kickedUser", userNameKicked);

  req.flash("success", `${userNameKicked} has been kicked`);
  res.redirect("/quiz");
};

// PATCH - reset-user
export const resetUserPatch = async (req, res) => {
  // Route removes usr from the quiz,
  // and deletes the userData.

  const userData = req.session.userData;
  req.session.userData = undefined;

  await Quiz.updateOne(
    { quizCode: userData.quizCode },
    {
      $pull: {
        users: { userName: userData.userName },
        usersSubmitted: userData.userName,
      },
    },
  );

  // Emits the resetUser signal picked up in lobby.ejs
  req.io.emit("resetUser", userData.quizCode, userData.userName);

  req.flash("error", "You have left the Quiz!");
  res.redirect("/");
};

// DELETE - reset-quiz
export const resetQuizDelete = async (req, res) => {
  // Route resets the quiz, removing all users, wiping thier userData
  // and deleting the quiz from the db.

  const userData = res.locals.userData;
  req.session.userData = undefined;

  await Quiz.deleteOne({ quizCode: userData.quizCode });

  // Emits the resetQuiz signal picked up in boilerplater.ejs
  // Sends the user back to '/' and wipes userData if thier quizCode is the same
  req.io.emit("resetQuiz", userData.quizCode);

  req.flash("error", "The quiz has been reset!");
  res.redirect("/");
};
