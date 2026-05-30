const { z } = require("zod");

const addCommentSchema = z.object({
  body: z.object({
    content: z.string({ required_error: "Comment content is required" })
      .trim()
      .min(1, "Comment content cannot be empty")
      .max(1000, "Comment content cannot exceed 1000 characters"),
  }),
  params: z.object({
    taskId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Task ID format"),
  }),
});

const getCommentsSchema = z.object({
  params: z.object({
    taskId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Task ID format"),
  }),
});

const deleteCommentSchema = z.object({
  params: z.object({
    commentId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Comment ID format"),
  }),
});

module.exports = { addCommentSchema, getCommentsSchema, deleteCommentSchema };
