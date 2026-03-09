import { Joi } from "@longrunner/shared-schemas";

export const reviewSchema = Joi.object({
  review: Joi.object({
    body: Joi.string().required().escapeHTML(),
  }).required(),
});
