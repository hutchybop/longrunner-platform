/* eslint-disable */
// Template for how the userData should look
req.session.userData = {
  userName: userNameJoin,
  quizCode: userQuizCode,
  progress: "/lobby", // '/lobby', '/quiz' or '/finish
  quizProgress: "na", // 'na', 'answering', 'answered' or 'waiting'
  questionNumber: 0,
  answers: [],
  quizMaster: false,
  auto: true, // set for quizMaster only
};
