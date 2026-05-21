const { z } = require('zod');

const createColumnSchema = z.object({
  body: z.object({
    title: z.string({ required_error: "Column title is required" })
      .trim()
      .min(1, "Column title cannot be empty"),
    boardId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Board ID format"),
  }),
});

const updateColumnSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    position: z.number().optional(),
  }),
  params: z.object({
    id: z.string().min(1), 
  }),
});

module.exports = { createColumnSchema, updateColumnSchema};