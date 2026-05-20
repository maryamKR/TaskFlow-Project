const { z } = require('zod');

const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  columnId: z.string().min(1, "Column ID is required"),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().nullable().optional() // Validates ISO date strings
});

const validateTask = (req, res, next) => {
  try {
   req.body = createTaskSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, error: error.errors[0].message });
  }
};

module.exports = { validateTask };