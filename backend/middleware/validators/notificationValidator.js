const { z } = require("zod");

const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Notification ID format"),
  }),
});

module.exports = { notificationIdParamSchema };
