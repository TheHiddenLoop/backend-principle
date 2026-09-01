import { body } from "express-validator";

export const signInValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required").optional(),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
];