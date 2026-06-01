const nodemailer = require("nodemailer");
const { inviteTemplate, passwordResetTemplate, overdueTaskTemplate } = require("./emailTemplates");

/**
 * Creates and returns a configured nodemailer transporter.
 * Reads SMTP credentials from environment variables.
 * Supports any SMTP provider (Gmail, Brevo, AWS SES, etc.)
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === "true", // true for port 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Sends a board invitation email to a newly added member.
 *
 * @param {string} toEmail      - Recipient's email address.
 * @param {string} boardTitle   - The name of the board the user was invited to.
 * @param {string} inviterName  - The username of the person who sent the invite.
 * @param {string} inviterEmail - The board owner's email, used as Reply-To so replies go to them directly.
 */
const sendInviteEmail = async (toEmail, boardTitle, inviterName, inviterEmail) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"TaskFlow" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      replyTo: inviterEmail,  // Replies go to the board owner, not the platform
      subject: `${inviterName} invited you to "${boardTitle}" on TaskFlow`,
      html: inviteTemplate(boardTitle, inviterName),
    });
    console.log(`[Email] Invite sent to ${toEmail} for board "${boardTitle}"`);
  } catch (err) {
    // Log but don't crash the request — email is non-critical
    console.error(`[Email] Failed to send invite to ${toEmail}:`, err.message);
  }
};

/**
 * Sends a password reset email with a time-limited token link.
 *
 * @param {string} toEmail   - Recipient's email address.
 * @param {string} resetUrl  - The full reset URL including the raw token.
 */
const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"TaskFlow" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "Reset Your TaskFlow Password",
      html: passwordResetTemplate(resetUrl),
    });
    console.log(`[Email] Password reset link sent to ${toEmail}`);
  } catch (err) {
    // Log but don't crash — the token is still valid even if email fails
    console.error(`[Email] Failed to send password reset to ${toEmail}:`, err.message);
  }
};

/**
 * Sends an email notification when a task becomes overdue.
 *
 * @param {string} toEmail    - Recipient's email address.
 * @param {string} taskTitle  - Title of the overdue task.
 * @param {string} dueDate    - Formatted due date string.
 * @param {string} boardTitle - Title of the board this task belongs to.
 */
const sendOverdueTaskEmail = async (toEmail, taskTitle, dueDate, boardTitle) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"TaskFlow" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Overdue Task Alert: "${taskTitle}"`,
      html: overdueTaskTemplate(taskTitle, dueDate, boardTitle),
    });
    console.log(`[Email] Overdue task alert sent to ${toEmail} for task "${taskTitle}"`);
  } catch (err) {
    console.error(`[Email] Failed to send overdue alert to ${toEmail}:`, err.message);
  }
};

module.exports = { sendInviteEmail, sendPasswordResetEmail, sendOverdueTaskEmail };
