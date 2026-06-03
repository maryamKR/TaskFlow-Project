# TaskFlow Email Service

## Overview

TaskFlow uses [Nodemailer](https://nodemailer.com/) to send transactional and automated emails for four scenarios:

1. **Board Invitations (registered users)** — sent when an owner invites someone already on TaskFlow
2. **Board Invitations (unregistered users)** — sent to invite someone who doesn't have an account yet
3. **Password Resets** — sent when a user requests a password reset link
4. **Overdue Task Alerts** — automated daily notifications for tasks past their due date

---

## How Email Sending Works

Each email sent by TaskFlow involves up to three distinct email addresses:

| Role | Source | Purpose |
|---|---|---|
| **From** (`From:`) | `EMAIL_USER` in `.env` | The platform SMTP account that physically sends the email |
| **Reply-To** | Board owner's email from the database | When the recipient hits "Reply", it goes directly to the owner |
| **To** | Invited user's email or assignee's email | The actual recipient |

### Example of what a recipient sees

```
From:     TaskFlow <taskflow.app@gmail.com>
Reply-To: board_owner@company.com
To:       new_collaborator@example.com
Subject:  john_doe invited you to "Project Alpha" on TaskFlow
```

The platform Gmail account acts purely as the **delivery mechanism**. The visible "identity" of the email comes from the database-stored user emails.

---

## Setup — Required Environment Variables

Add the following to `backend/.env`:

```env
# Email (SMTP) — required for board invites and password resets
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_app_email@gmail.com
EMAIL_PASS=your16charapppassword

# Used in reset link URLs and invite email links
FRONTEND_URL=http://localhost:3000
```

> **Important:** `EMAIL_PASS` is **not** your normal Gmail password.
> You must generate a [Gmail App Password](https://myaccount.google.com/apppasswords).
> This requires **2-Step Verification** to be enabled on your Google account.

### Steps to generate a Gmail App Password

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Navigate to **Security → 2-Step Verification** and enable it
3. Go to **Security → App Passwords**
4. Create a new App Password: "Mail" → "Other (Custom name)" → name it `TaskFlow`
5. Copy the 16-character password into `EMAIL_PASS`

> ⚠️ Gmail shows the App Password with spaces (e.g. `xxxx xxxx xxxx xxxx`).
> **Remove all spaces** before pasting: `EMAIL_PASS=xxxxxxxxxxxxxxxx`

---

## Alternative SMTP Providers

Any SMTP-compatible provider works. Popular free alternatives:

| Provider | `EMAIL_HOST` | `EMAIL_PORT` | Free Tier |
|---|---|---|---|
| Gmail | `smtp.gmail.com` | `587` | 500/day |
| [Brevo](https://brevo.com) | `smtp-relay.brevo.com` | `587` | 300/day |
| [Mailgun](https://mailgun.com) | `smtp.mailgun.org` | `587` | 100/day |

---

## File Structure

```
backend/utils/
├── emailService.js      # Nodemailer transporter + 4 send functions
├── emailTemplates.js    # Branded HTML email templates
└── scheduledJobs.js     # node-cron scheduler for automated jobs
```

---

## `emailService.js` — Public API

```js
const {
  sendInviteEmail,
  sendUnregisteredInviteEmail,
  sendPasswordResetEmail,
  sendOverdueTaskEmail
} = require('../utils/emailService');

// Board invite — registered user already on TaskFlow
await sendInviteEmail(
  userToInvite.email,   // to
  board.title,          // board name shown in email subject
  req.user.username,    // inviter name shown in email body
  req.user.email        // inviter email set as Reply-To
);

// Board invite — unregistered user (sent sign-up link)
await sendUnregisteredInviteEmail(
  cleanEmail,           // to (the unregistered email address)
  board.title,          // board name shown in email
  req.user.username,    // inviter name
  req.user.email        // inviter email set as Reply-To
);

// Password reset
await sendPasswordResetEmail(
  user.email,           // to
  resetUrl              // e.g. http://localhost:3000/reset-password/abc123token
);

// Overdue task alert
await sendOverdueTaskEmail(
  recipient.email,      // to — task assignee (or creator as fallback)
  task.title,           // task title displayed in email
  formattedDueDate,     // human-readable due date string
  boardTitle            // board name for context
);
```

---

## `emailTemplates.js` — HTML Templates

Four responsive, branded HTML templates are exported:

| Template Function | Used By | Content |
|---|---|---|
| `inviteTemplate(boardTitle, inviterName)` | `sendInviteEmail` | Welcome + board link for existing user |
| `inviteUnregisteredTemplate(boardTitle, inviterName)` | `sendUnregisteredInviteEmail` | Sign-up CTA for unregistered user |
| `passwordResetTemplate(resetUrl)` | `sendPasswordResetEmail` | Reset button with 10-min expiry notice |
| `overdueTaskTemplate(taskTitle, dueDate, boardTitle)` | `sendOverdueTaskEmail` | Overdue alert with task details |

All templates use TaskFlow's brand colours and are designed to render cleanly in both light and dark email clients.

---

## Overdue Task Scheduler (`scheduledJobs.js`)

`initScheduledJobs()` registers a `node-cron` job that fires every day at midnight (`0 0 * * *`):

```
Daily midnight trigger:
  1. Query: Task.find({
       isDone: false,
       dueDate: { $lt: now },
       overdueEmailSent: false
     })
  2. For each task:
     a. Resolve recipient:
        → task.assignedTo (populate email) OR task.createdBy (populate email)
     b. Resolve board title via column → board lookup
     c. sendOverdueTaskEmail(email, task.title, dueDate, boardTitle)
     d. task.overdueEmailSent = true → task.save()
          ↑ Prevents duplicate alerts from firing every subsequent day
```

This job is initialised automatically on server startup — no manual configuration required.

---

## Error Handling

Email failures are **non-fatal**. If Nodemailer throws (wrong credentials, SMTP timeout, etc.):

- **Board invitations** — the coworker is still added to the board; only the email is missed. Error is logged as `[Email] Failed to send invite`.
- **Password reset** — the token is **rolled back** from the database before re-throwing, preventing orphaned reset tokens.
- **Overdue alerts** — the task's `overdueEmailSent` is **not** set to `true` if sending fails, so the cron will retry the next day.

Always check `console.error` / server logs if emails are not arriving.

---

## Security & Rate Limiting

| Protection | Implementation |
|---|---|
| **User Enumeration Guard** | `POST /auth/forgot-password` always returns a generic `200` response regardless of whether the email is registered |
| **Rate Limiting** | Password reset limited to **3 requests/hour/IP** via `passwordResetLimiter` |
| **Token Hashing** | Reset tokens are stored as SHA-256 hashes in MongoDB — the raw token is only ever sent in the email link |
| **Token Expiry** | Reset tokens are valid for exactly **10 minutes** (`Date.now() + 10 * 60 * 1000`) |
| **Token Rollback** | If SMTP fails during password reset, the token and expiry are cleared from the user document |
