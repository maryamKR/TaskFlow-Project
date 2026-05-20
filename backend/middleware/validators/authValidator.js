const { z } = require("zod");

// Blueprint for user registration input
const registerSchema = z.object({
  username: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(50, "Name cannot exceed 50 characters"),
    
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Invalid email format"),
    
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters long")
    .max(128, "Password cannot exceed 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// Blueprint for user login input
const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Invalid email format"),
    
  password: z
    .string({ required_error: "Password is required" }),
});

const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // parseAsync validates data and strips away fields not explicitly defined in the schema
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      // Passes the ZodError directly to errorHandler.js
      next(error);
    }
  };
};

module.exports = {
  validateRegister: validateRequest(registerSchema),
  validateLogin: validateRequest(loginSchema),
};