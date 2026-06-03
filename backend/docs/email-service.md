# TaskFlow Email Service

## Overview

TaskFlow uses [Nodemailer](https://nodemailer.com/) to send transactional and automated emails for three features:

1. **Board Invitations** — sent when a board owner invites a new member
2. **Password Resets** — sent when a user requests a password reset link
3. **Overdue Task Alerts** — an automated daily check notifying assignees/creators of overdue tasks

---

## How Email Sending Works

There are **two different email addresses** involved in every invite email. Understanding the difference is important:

| Role | Where it comes from | What it does |
|---|---|---|
| **Sender** (`From`) | `EMAIL_USER` in `.env` | The platform's Gmail/SMTP account — authenticates with Gmail to physically send the email |
| **Reply-To** | Board owner's email from the database (`req.user.email`) | If the invited user hits "Reply", the reply goes directly to the board owner |
| **Recipient** (`To`) | Invited user's email from the database (`userToInvite.email`) | The person receiving the invite |

### Example of what the invited user sees

```
From:     TaskFlow <taskflow.app@gmail.com>
Reply-To: board_owner@example.com
To:       invited_member@example.com
Subject:  assmatest invited you to "My Board" on TaskFlow
```

The platform Gmail account is purely the **delivery mechanism** (like a post office). The emails visible to the end user come from the database.

---

## Setup — Required Environment Variables

Add the following to your `.env` file (see `.env.example` for reference):

```env
# Email (SMTP) — required for board invites and password reset
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_app_email@gmail.com
EMAIL_PASS=your_gmail_app_password
FRONTEND_URL=http://localhost:5173
```

> **Important:** `EMAIL_PASS` is **not** your normal Gmail login password.
> You must generate a [Gmail App Password](https://myaccount.google.com/apppasswords).
> This requires **2-Step Verification** to be enabled on your Google account.

### Steps to get a Gmail App Password

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Navigate to **Security → 2-Step Verification** and enable it
3. Go to **Security → App Passwords**
4. Create a new App Password for "Mail" → "Other (Custom name)" → name it `TaskFlow`
5. Copy the generated 16-character password into `EMAIL_PASS`

> ⚠️ **Gmail displays the App Password with spaces** (e.g., `xxxx xxxx xxxx xxxx`).
> You **must remove all spaces** before pasting it into your `.env` file.
> Correct: `EMAIL_PASS=xxxxxxxxxxxxxxxx`
> Wrong:   `EMAIL_PASS=xxxx xxxx xxxx xxxx`

---

## Alternative SMTP Providers

You are not locked into Gmail. Any SMTP provider works. Popular free options:

| Provider | `EMAIL_HOST` | `EMAIL_PORT` | Free Tier |
|---|---|---|---|
| Gmail | `smtp.gmail.com` | `587` | 500/day |
| [Brevo](https://brevo.com) | `smtp-relay.brevo.com` | `587` | 300/day |
| [Mailgun](https://mailgun.com) | `smtp.mailgun.org` | `587` | 100/day |

---

## File Structure

```
backend/utils/
├── emailService.js      # Nodemailer transporter + send functions
├── emailTemplates.js    # HTML email templates (invite, password reset, overdue)
└── scheduledJobs.js     # node-cron scheduler for automated jobs
```

### `emailService.js` — Public API

```js
const { sendInviteEmail, sendPasswordResetEmail, sendOverdueTaskEmail, sendUnregisteredInviteEmail } = require('../utils/emailService');

// Board invite (registered user)
await sendInviteEmail(
  userToInvite.email,   // to
  board.title,          // board name shown in email
  req.user.username,    // inviter's name shown in email
  req.user.email        // inviter's email set as Reply-To
);

// Board invite (unregistered user)
await sendUnregisteredInviteEmail(
  cleanEmail,           // to
  board.title,          // board name shown in email
  req.user.username,    // inviter's name shown in email
  req.user.email        // inviter's email set as Reply-To
);

// Password reset
await sendPasswordResetEmail(
  user.email,           // to
  resetUrl              // full URL with token, e.g. http://localhost:5173/reset-password/abc123
);

// Overdue task alert
await sendOverdueTaskEmail(
  recipient.email,      // to (assignee or creator)
  task.title,           // task title
  formattedDueDate,     // due date string
  boardTitle            // board title
);
```

### `emailTemplates.js` — HTML Templates

- `inviteTemplate(boardTitle, inviterName)` — Returns the board invite HTML
- `passwordResetTemplate(resetUrl)` — Returns the password reset HTML
- `overdueTaskTemplate(taskTitle, dueDate, boardTitle)` — Returns the overdue task HTML
- `inviteUnregisteredTemplate(boardTitle, inviterName)` — Returns the unregistered board invite HTML

Templates are fully styled, responsive HTML emails matching TaskFlow's color branding.

---

## Overdue Task Scheduler (`scheduledJobs.js`)

TaskFlow utilizes `node-cron` to automatically look for overdue tasks every night at midnight (`0 0 * * *`). 
- It finds tasks that are overdue, not done, and have not yet had an email sent (`overdueEmailSent: { $ne: true }`).
- It determines the recipient by looking at the task's assignee (`assignedTo`), and falls back to the task creator (`createdBy`) if no one is assigned.
- Once the alert email is successfully requested, `task.overdueEmailSent` is set to `true` to prevent duplicate alerts.


---

## Error Handling

Email sending failures are **non-fatal**. If the SMTP call fails for any reason (wrong credentials, network issue, etc.), the error is logged to the console but the API request continues and returns success.

This means:
- A board invite still succeeds even if the email bounces
- A password reset token is still saved to the DB even if the email fails

Always check server logs (`[Email] Failed to send ...`) if emails are not arriving.

---

## Security & Rate Limiting

- **Generic Responses:** The password reset request endpoint returns a generic message to prevent user enumeration.
- **Rate Limiting:** Password reset requests are limited to **3 per hour per IP** to prevent SMTP relay abuse and spamming.
- **Token Hashing:** Reset tokens are stored as SHA-256 hashes in the database.
- **Expiry:** All reset links are strictly valid for **10 minutes**.
