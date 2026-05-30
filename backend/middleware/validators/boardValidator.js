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

const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).trim().email("Invalid email format"),
  }),
  params: z.object({
    boardId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Board ID format"),
  }),
});

const reorderColumnsSchema = z.object({
  body: z.object({
    columnIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Column ID format")),
  }),
  params: z.object({
    boardId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Board ID format"),
  }),
});

const boardIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Board ID format").optional(),
    boardId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Board ID format").optional(),
  }).refine((data) => data.id || data.boardId, {
    message: "Either id or boardId parameter must be provided",
  }),
});

const boardMemberParamSchema = z.object({
  params: z.object({
    boardId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Board ID format"),
    memberId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Member ID format"),
  }),
});

module.exports = {
  createBoardSchema,
  inviteMemberSchema,
  reorderColumnsSchema,
  boardIdParamSchema,
  boardMemberParamSchema,
};