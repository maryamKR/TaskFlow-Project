const cron = require("node-cron");
const Task = require("../models/Task");
const User = require("../models/User");
const Column = require("../models/Column");
const Board = require("../models/Board");
const { sendOverdueTaskEmail } = require("./emailService");

/**
 * Initializes all scheduled cron jobs for the application.
 */
const initScheduledJobs = () => {
  console.log("[Scheduler] Initializing daily cron job for overdue tasks...");

  // Runs once every day at midnight (00:00)
  // Pattern: minute hour day-of-month month day-of-week
  cron.schedule("0 0 * * *", async () => {
    console.log("[Scheduler] Running daily check for overdue tasks...");
    try {
      const now = new Date();

      // Find tasks that are:
      // 1. Past due date
      // 2. Not marked as Done (isDone: false)
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

      console.log(`[Scheduler] Found ${overdueTasks.length} new overdue tasks to notify.`);

      for (const task of overdueTasks) {
        // Determine recipient: prioritize assignee, fallback to task creator
        const recipient = task.assignedTo || task.createdBy;
        if (!recipient || !recipient.email) {
          console.warn(`[Scheduler] Skipping task "${task.title}" (ID: ${task._id}) - no assignee or creator email found.`);
          continue;
        }

        const boardTitle = task.column?.board?.title || "Unknown Board";
        const formattedDueDate = new Date(task.dueDate).toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        console.log(`[Scheduler] Sending overdue email to ${recipient.email} for task "${task.title}"`);
        
        // Send email
        await sendOverdueTaskEmail(
          recipient.email,
          task.title,
          formattedDueDate,
          boardTitle
        );

        // Mark task as notified to prevent duplicate alerts in future runs
        task.overdueEmailSent = true;
        await task.save();
      }

      console.log("[Scheduler] Overdue tasks daily run finished successfully.");
    } catch (err) {
      console.error("[Scheduler] Error in overdue tasks cron job:", err);
    }
  });
};

module.exports = { initScheduledJobs };
