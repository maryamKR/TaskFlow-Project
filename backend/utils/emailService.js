const { inviteTemplate, passwordResetTemplate, overdueTaskTemplate, inviteUnregisteredTemplate } = require("./emailTemplates");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/**
 * Sends an email using the Brevo HTTP API.
 * This is used instead of SMTP to ensure compatibility with environments
 * that block outbound SMTP connections (like Railway hobby tier).
 *
 * @param {Object} payload The email payload
 * @param {Array<{email: string, name?: string}>} payload.to Recipient list
 * @param {Object} [payload.replyTo] Optional reply-to address {email, name}
 * @param {string} payload.subject Email subject
 * @param {string} payload.htmlContent Email HTML body
 */
const sendBrevoEmail = async ({ to, replyTo, subject, htmlContent }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "notifications@taskflow.com";
  const senderName = process.env.BREVO_SENDER_NAME || "TaskFlow";

  if (!apiKey) {
    console.warn("[Email] BREVO_API_KEY is not set. Email not sent.");
    return;
  }

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to,
    subject,
    htmlContent,
  };

  if (replyTo) {
    payload.replyTo = replyTo;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Brevo API Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
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
    await sendBrevoEmail({
      to: [{ email: toEmail }],
      replyTo: { email: inviterEmail },
      subject: `${inviterName} invited you to "${boardTitle}" on TaskFlow`,
      htmlContent: inviteTemplate(boardTitle, inviterName, FRONTEND_URL),
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
    await sendBrevoEmail({
      to: [{ email: toEmail }],
      subject: "Reset Your TaskFlow Password",
      htmlContent: passwordResetTemplate(resetUrl),
    });
    console.log(`[Email] Password reset link sent to ${toEmail}`);
  } catch (err) {
    // Log but don't crash — the token is still valid even if email fails
    console.error(`[Email] Failed to send password reset to ${toEmail}:`, err.message);
    throw err; // Re-throw to allow controller to rollback token
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
    await sendBrevoEmail({
      to: [{ email: toEmail }],
      subject: `Overdue Task Alert: "${taskTitle}"`,
      htmlContent: overdueTaskTemplate(taskTitle, dueDate, boardTitle, FRONTEND_URL),
    });
    console.log(`[Email] Overdue task alert sent to ${toEmail} for task "${taskTitle}"`);
  } catch (err) {
    console.error(`[Email] Failed to send overdue alert to ${toEmail}:`, err.message);
  }
};

/**
 * Sends a registration invite email to a user who doesn't have an account yet.
 *
 * @param {string} toEmail      - Recipient's email address.
 * @param {string} boardTitle   - The name of the board they are being invited to.
 * @param {string} inviterName  - The username of the person who sent the invite.
 * @param {string} inviterEmail - The board owner's email, used as Reply-To.
 */
const sendUnregisteredInviteEmail = async (toEmail, boardTitle, inviterName, inviterEmail) => {
  try {
    await sendBrevoEmail({
      to: [{ email: toEmail }],
      replyTo: { email: inviterEmail },
      subject: `${inviterName} invited you to join TaskFlow and collaborate on "${boardTitle}"`,
      htmlContent: inviteUnregisteredTemplate(boardTitle, inviterName, FRONTEND_URL),
    });
    console.log(`[Email] Unregistered invite sent to ${toEmail} for board "${boardTitle}"`);
  } catch (err) {
    console.error(`[Email] Failed to send unregistered invite to ${toEmail}:`, err.message);
  }
};

module.exports = { sendInviteEmail, sendPasswordResetEmail, sendOverdueTaskEmail, sendUnregisteredInviteEmail };
