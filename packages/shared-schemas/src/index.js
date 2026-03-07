import BaseJoi from "joi";
import sanitizeHtml from "sanitize-html";

const extension = (joi) => ({
  type: "string",
  base: joi.string(),
  messages: {
    "string.escapeHTML": "{{#label}} must not include HTML!",
  },
  rules: {
    escapeHTML: {
      method() {
        return this.$_addRule("escapeHTML");
      },
      validate(value, helpers) {
        const clean = sanitizeHtml(value, {
          allowedTags: [],
          allowedAttributes: {},
        });
        if (clean !== value)
          return helpers.error("string.escapeHTML", { value });
        return clean;
      },
    },
  },
});

const Joi = BaseJoi.extend(extension);

export const tandcSchema = Joi.object({
  name: Joi.string().required().escapeHTML(),
  message: Joi.string().required().escapeHTML(),
  email: Joi.string().email().required(),
  "g-recaptcha-response": Joi.string().allow(null, ""),
}).required();

export const loginSchema = Joi.object({
  username: Joi.string().required().escapeHTML(),
  password: Joi.string().required().escapeHTML(),
  email: Joi.string().email(),
}).required();

export const registerSchema = Joi.object({
  username: Joi.string().required().escapeHTML(),
  email: Joi.string().email().required(),
  password: Joi.string().required().escapeHTML(),
  confirm_password: Joi.string().required().escapeHTML(),
  tnc: Joi.string().valid("checked").optional(),
}).required();

export const forgotSchema = Joi.object({
  email: Joi.string().email().required(),
}).required();

export const resetSchema = Joi.object({
  password: Joi.string().required().escapeHTML(),
  confirm_password: Joi.string().required().escapeHTML(),
}).required();

export const detailsSchema = Joi.object({
  username: Joi.string().required().escapeHTML(),
  password: Joi.string().required().escapeHTML(),
  email: Joi.string().email().required(),
}).required();

export const deleteSchema = Joi.object({
  password: Joi.string().required().escapeHTML(),
}).required();

export default {
  tandcSchema,
  loginSchema,
  registerSchema,
  forgotSchema,
  resetSchema,
  detailsSchema,
  deleteSchema
};
