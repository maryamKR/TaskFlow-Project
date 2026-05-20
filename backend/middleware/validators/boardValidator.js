const { z } = require("zod");

const createBoardSchema = z.object({
  body: z.object({
    title: z.string({ required_error: "Board title is required" })
      .trim()
      .min(1, "Board title cannot be empty")
      .max(50, "Board title cannot exceed 50 characters"),
    coworkers: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid User ID format")).optional(),
  }),
});

module.exports = { createBoardSchema };