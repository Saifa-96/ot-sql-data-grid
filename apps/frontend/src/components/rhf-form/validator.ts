import { z } from "zod";
import { FieldConfig, Validator } from "./dynamic-control-types";

export const getZodValidatorByType = (
  { type }: FieldConfig,
  { min, max, required, regex }: Validator = {}
): z.ZodTypeAny => {
  let validator: z.ZodTypeAny;

  switch (type) {
    case "text":
      validator = z
        .string()
        .min(min ?? 0, { message: "Minimum length not met" })
        .max(max ?? Infinity, { message: "Maximum length exceeded" });
      break;
    case "number":
      validator = z
        .number()
        .min(min ?? 0, { message: "Minimum value not met" })
        .max(max ?? Infinity, { message: "Maximum value exceeded" });
      break;
  }

  if (regex) {
    const regexPattern = new RegExp(regex);
    validator = validator.refine((val) => regexPattern.test(val), {
      message: "Invalid format",
    });
  }

  // TODO: msg is not used.
  if (required) {
    const msg = "This field is required";
    if (validator instanceof z.ZodString) {
      validator = validator.nonempty({ message: msg });
    } else if (validator instanceof z.ZodNumber) {
      validator = validator.refine((val) => val !== null && val !== undefined, {
        message: msg,
      });
    }
  } else {
    validator = validator.optional();
  }

  return validator;
};
