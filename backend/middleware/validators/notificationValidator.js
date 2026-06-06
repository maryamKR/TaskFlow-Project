const { z } = require("zod");

const getNotificationsQuerySchema = z.object({
  query: z.object({
    page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  }),
});

const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Notification ID format"),
  }),
});

module.exports = { getNotificationsQuerySchema, notificationIdParamSchema };
