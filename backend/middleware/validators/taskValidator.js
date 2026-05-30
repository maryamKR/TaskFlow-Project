const { z } = require("zod");

const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Task title is required"),
    columnId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Column ID format"),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    label: z
      .enum(["Bug", "Frontend", "Backend", "Documentation", "DevOps", "Design", "Testing", "Feature", "Other"])
      .nullable()
      .optional(),
    dueDate: z.string().datetime().nullable().optional(),
    assignedTo: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid User ID format")
      .nullable()
      .optional(),
  }),
});

const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Task title is required").optional(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    assignedTo: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid User ID format")
      .nullable()
      .optional(),
  }),
});

const getTasksQuerySchema = z.object({
  query: z.object({
    boardId: z.string().min(1),
    columnId: z.string().optional(),
    assignedTo: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    search: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

const moveTaskSchema = z.object({
  body: z.object({
    taskId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Task ID format"),
    sourceColumnId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Source Column ID format"),
    destinationColumnId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Destination Column ID format"),
  }),
});

const reorderTaskSchema = z.object({
  body: z.object({
    taskIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Task ID format")),
  }),
  params: z.object({
    columnId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Column ID format"),
  }),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  getTasksQuerySchema,
  moveTaskSchema,
  reorderTaskSchema,
};
