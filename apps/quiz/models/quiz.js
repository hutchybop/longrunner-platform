import mongoose from "mongoose";
const Schema = mongoose.Schema;

const QuizSchema = new Schema({
  quizCode: {
    type: Number,
    required: true,
  },
  questions: [
    {
      type: Schema.Types.ObjectId,
      ref: "Question",
    },
  ],
  quizMaster: {
    type: String,
  },
  users: [
    {
      userName: {
        type: String,
      },
      score: {
        type: Number,
      },
    },
  ],
  progress: {
    type: String, // '/lobby', '/quiz' or '/finish
    required: true,
  },
  questionNumber: {
    type: Number,
  },
  usersSubmitted: [
    {
      type: String,
    },
  ],
});

const Quiz = mongoose.model("Quiz", QuizSchema);
export default Quiz;
