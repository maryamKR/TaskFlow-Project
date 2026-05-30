const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    username: z
      .string({ required_error: "Username is required" })
      .trim()
      .min(3, "Username must be at least 3 characters long")
      .max(30, "Username cannot exceed 30 characters"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .email("Please provide a valid email address"),
    password: z
      .string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters long"),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .email("Please provide a valid email address"),
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required"),
  }),
});

module.exports = { registerSchema, loginSchema };