const { z } = require('zod');


const createTaskSchema = z.object({

  body: z.object({

    title: z.string().min(1, "Task title is required"),

    columnId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Column ID format"),

    description: z.string().optional(),

    priority: z.enum(['low', 'medium', 'high']).default('medium'),

    dueDate: z.string().datetime().nullable().optional()

    })

});


module.exports = { createTaskSchema };