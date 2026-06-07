const { z } = require('zod');

const RESERVED_COLUMN_NAMES = ["to do", "in progress", "review", "done"];

const createColumnSchema = z.object({
  body: z.object({
    title: z.string({ required_error: "Column title is required" })
      .trim()
      .min(1, "Column title cannot be empty")
      .refine(
        (val) => !RESERVED_COLUMN_NAMES.includes(val.toLowerCase()),
        { message: "Column name is reserved as a default column name" }
      ),
    boardId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Board ID format"),
  }),
});

const getColumnsSchema = z.object({
  params: z.object({
    boardId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Board ID format"),
  }),
});

const columnIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Column ID format"),
  }),
});

module.exports = {
  createColumnSchema,
  getColumnsSchema,
  columnIdParamSchema,
};