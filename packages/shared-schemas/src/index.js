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
        if (clean !== value) {
          return helpers.error("string.escapeHTML", { value });
        }
        return clean;
      },
    },
  },
});

export const Joi = BaseJoi.extend(extension);

const tandcSchema = Joi.object({
  name: Joi.string().required().escapeHTML(),
  message: Joi.string().required().escapeHTML(),
  email: Joi.string().email().required(),
  "g-recaptcha-response": Joi.string().allow(null, ""),
}).required();

const loginSchema = Joi.object({
  username: Joi.string().required().escapeHTML(),
  password: Joi.string().required().escapeHTML(),
  email: Joi.string().email(),
}).required();

const registerSchema = Joi.object({
  username: Joi.string().required().escapeHTML(),
  email: Joi.string().email().required(),
  password: Joi.string().required().escapeHTML(),
  confirm_password: Joi.string().required().escapeHTML(),
  tnc: Joi.string().valid("checked").optional(),
}).required();

const forgotSchema = Joi.object({
  email: Joi.string().email().required(),
}).required();

const resetSchema = Joi.object({
  password: Joi.string().required().escapeHTML(),
  confirm_password: Joi.string().required().escapeHTML(),
}).required();

const detailsSchema = Joi.object({
  username: Joi.string().required().escapeHTML(),
  password: Joi.string().required().escapeHTML(),
  email: Joi.string().email().required(),
}).required();

const deleteSchema = Joi.object({
  password: Joi.string().required().escapeHTML(),
}).required();

export function createPolicySchemas() {
  return {
    tandcSchema,
  };
}

export function createAuthSchemas() {
  return {
    loginSchema,
    registerSchema,
    forgotSchema,
    resetSchema,
    detailsSchema,
    deleteSchema,
  };
}

export default {
  Joi,
  ...createPolicySchemas(),
  ...createAuthSchemas(),
  createPolicySchemas,
  createAuthSchemas,
};
