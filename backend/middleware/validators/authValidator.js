const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    username: z.string({ required_error: "Username is required" }).trim().min(2, "Username must be at least 2 characters long").max(50, "Username cannot exceed 50 characters"),
    email: z.string({ required_error: "Email is required" }).trim().email("Invalid email format"),
    password: z.string({ required_error: "Password is required" }).min(6, "Password must be at least 6 characters long").max(128, "Password cannot exceed 128 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number"),
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).trim().email("Invalid email format"),
    password: z.string({ required_error: "Password is required" }),
  })
});

module.exports = { registerSchema, loginSchema };