/**
 * HTML email template for board invitations.
 *
 * @param {string} boardTitle  - The name of the board the user is being invited to.
 * @param {string} inviterName - The username of the person sending the invite.
 * @returns {string} Full HTML string ready to send as an email body.
 */
const inviteTemplate = (boardTitle, inviterName) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to a board</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#be185d,#9d174d);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">TaskFlow</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Project Management Made Simple</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#1f2937;font-size:22px;font-weight:600;">You've been invited! 🎉</h2>
              <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
                <strong style="color:#111827;">${inviterName}</strong> has invited you to collaborate on the board:
              </p>
              <div style="background:#fdf2f8;border-left:4px solid #be185d;border-radius:6px;padding:16px 20px;margin-bottom:28px;">
                <p style="margin:0;color:#be185d;font-size:18px;font-weight:700;">${boardTitle}</p>
              </div>
              <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6;">
                Log in to your TaskFlow account to view the board and start collaborating with your team.
              </p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}"
                 style="display:inline-block;background:#be185d;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                Open TaskFlow →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                This email was sent by TaskFlow. If you believe this was a mistake, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * HTML email template for password reset requests.
 *
 * @param {string} resetUrl - The full URL including the raw reset token (expires in 10 min).
 * @returns {string} Full HTML string ready to send as an email body.
 */
const passwordResetTemplate = (resetUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#be185d,#9d174d);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">TaskFlow</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Project Management Made Simple</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#1f2937;font-size:22px;font-weight:600;">Password Reset Request 🔐</h2>
              <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
                We received a request to reset your TaskFlow password. Click the button below to set a new password.
                This link will expire in <strong style="color:#111827;">10 minutes</strong>.
              </p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#be185d;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;margin-bottom:28px;">
                Reset My Password →
              </a>
              <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">
                If you did not request a password reset, you can safely ignore this email — your password will not change.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                This link expires in 10 minutes for your security.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * HTML email template for overdue task notifications.
 *
 * @param {string} taskTitle  - The title of the overdue task.
 * @param {string} dueDate    - The formatted due date of the task.
 * @param {string} boardTitle  - The title of the board the task belongs to.
 * @returns {string} Full HTML string ready to send as an email body.
 */
const overdueTaskTemplate = (taskTitle, dueDate, boardTitle) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Task Overdue Notification</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#be185d,#9d174d);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">TaskFlow</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Project Management Made Simple</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#dc2626;font-size:22px;font-weight:600;">Task Overdue ⚠️</h2>
              <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
                The following task in board <strong style="color:#111827;">"${boardTitle}"</strong> is overdue:
              </p>
              <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;padding:16px 20px;margin-bottom:28px;">
                <p style="margin:0 0 4px;color:#dc2626;font-size:18px;font-weight:700;">${taskTitle}</p>
                <p style="margin:0;color:#991b1b;font-size:14px;">Was due on: <strong>${dueDate}</strong></p>
              </div>
              <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6;">
                Please log in to TaskFlow to complete or reschedule the task.
              </p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}"
                 style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                View Task on TaskFlow →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                This is an automated notification. You are receiving this because you are assigned to or created this task.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

module.exports = { inviteTemplate, passwordResetTemplate, overdueTaskTemplate };
