import { Joi } from "@longrunner/shared-schemas";

export const lobbyNewSchema = Joi.object({
  userNameNew: Joi.string().required().escapeHTML(),
  amount: Joi.string().valid("10", "20", "30", "40", "50").required(),
  diff: Joi.string()
    .valid(
      "easy",
      "medium",
      "hard",
      "easy,medium",
      "easy,medium,hard",
      "medium,hard",
    )
    .escapeHTML()
    .required(),
  auto: Joi.string().valid("on").escapeHTML(),
}).required();

export const lobbyJoinSchema = Joi.object({
  userNameJoin: Joi.string().required().escapeHTML(),
  quizCode: Joi.number().required(),
}).required();

export const userDataSchema = Joi.object({
  userName: Joi.string().required().escapeHTML(),
  quizCode: Joi.string().required().escapeHTML(),
  progress: Joi.string().valid("/lobby", "/quiz", "/finish").required(),
  quizProgress: Joi.string()
    .valid("na", "answering", "answered", "waiting")
    .required(),
  questionNumber: Joi.number().min(0).max(50).required(),
  answers: Joi.alternatives().try(
    Joi.array().items(Joi.string().escapeHTML()),
    Joi.string().escapeHTML(),
  ), // Handles both array or string inputs
  quizMaster: Joi.boolean().required(),
  auto: Joi.boolean(),
});
