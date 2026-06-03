const cron = require("node-cron");
const Task = require("../models/Task");
const { sendOverdueTaskEmail } = require("./emailService");

/**
 * Initializes all scheduled cron jobs for the application.
 */
const initScheduledJobs = () => {
  console.log("[Scheduler] Initializing daily cron job for overdue tasks...");

  cron.schedule("0 0 * * *", async () => {
    console.log("[Scheduler] Running daily check for overdue tasks...");
    try {
      const now = new Date();

      // Find tasks that are:
      // 1. Past due date
      // 2. Not marked as Done
      // 3. Email alert has not been sent yet
      const overdueTasks = await Task.find({
        dueDate: { $lt: now, $ne: null },
        isDone: false,
        overdueEmailSent: { $ne: true },
      })
      .populate("assignedTo", "email username")
      .populate("createdBy", "email username")
      .populate({
        path: "column",
        populate: {
          path: "board",
          select: "title",
        },
      });

      if (overdueTasks.length === 0) {
        console.log("[Scheduler] No new overdue tasks found.");
        return;
      }

      console.log(`[Scheduler] Processing ${overdueTasks.length} overdue tasks...`);

      const bulkUpdates = [];
      const emailPromises = [];

      for (const task of overdueTasks) {
        const recipient = task.assignedTo || task.createdBy;
        if (!recipient || !recipient.email) continue;

        const boardTitle = task.column?.board?.title || "Unknown Board";
        const formattedDueDate = new Date(task.dueDate).toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Queue email sending (Parallel processing)
        emailPromises.push(
          sendOverdueTaskEmail(
            recipient.email,
            task.title,
            formattedDueDate,
            boardTitle
          )
        );

        // Queue bulk update operation
        bulkUpdates.push({
          updateOne: {
            filter: { _id: task._id },
            update: { $set: { overdueEmailSent: true } },
          },
        });
      }

      // Execute all emails in parallel and bulk update the database in one go
      await Promise.allSettled(emailPromises);
      if (bulkUpdates.length > 0) {
        await Task.bulkWrite(bulkUpdates);
      }

      console.log("[Scheduler] Overdue tasks daily run finished successfully.");
    } catch (err) {
      console.error("[Scheduler] Error in overdue tasks cron job:", err);
    }
  });
};

module.exports = { initScheduledJobs };
