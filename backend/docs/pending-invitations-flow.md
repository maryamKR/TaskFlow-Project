# TaskFlow Collaboration & Pending Invitation Flow

This document details how TaskFlow handles board invitations for both registered members and users who do not yet have a TaskFlow account.

---

## 🌟 Overview & Problem Solved

Previously, if a board owner wanted to invite a coworker to collaborate, they had to ensure the coworker already registered a TaskFlow account. Inviting any email address not in the database resulted in a `404 User Not Found` error.

With the new **Pending Invitations Flow**:
- Board owners can invite **any email address** instantly.
- If the email belongs to a **registered user**, they are added to the board immediately.
- If the email is **unregistered**, TaskFlow sends them a branded sign-up email and holds their invitation as **pending**.
- Once the unregistered user signs up using that email address, the system **auto-joins** them to all boards they were invited to, and notifies the respective board owners.

---

## 🔄 How the Flow Works (Simple Step-by-Step)

### Scenario A: Coworker ALREADY has a TaskFlow Account
1. The Board Owner goes to their board and inputs the coworker's email.
2. The coworker is immediately added to the board as a coworker.
3. The coworker receives:
   - An in-app notification: *"You have been invited to the board: [Board Title]"*
   - An invitation email with a `Reply-To` pointing to the owner's email address.
4. The Board Owner receives:
   - An in-app notification: *"[Coworker Username] has joined your board: [Board Title]"*

---

### Scenario B: Coworker DOES NOT have a TaskFlow Account
1. The Board Owner inputs the coworker's email (`newuser@example.com`).
2. TaskFlow detects the user is unregistered, so it:
   - Adds the email to the board's `pendingInvites` list.
   - Sends a registration invite email to the coworker: *"Join TaskFlow to collaborate on [Board Title]"*.
   - Returns a successful response: *"Invitation email sent to unregistered user. They will be added when they sign up."*
3. The coworker clicks the link in the email and registers a TaskFlow account using `newuser@example.com`.
4. Upon successful registration, the backend:
   - Finds all boards where `newuser@example.com` is in `pendingInvites`.
   - Moves the new user's ID into the board's active `coworkers` list.
   - Clears `newuser@example.com` from `pendingInvites`.
   - Generates an in-app notification for the **new user**: *"You have been added to the board: [Board Title]"*.
   - Generates an in-app notification for the **board owner**: *"[New User Username] has joined your board: [Board Title]"*.

---

## 🛠️ Technical Flow & Database Model

### 1. Model Changes (`Board.js`)
We introduced a `pendingInvites` array of strings to track emails that are invited but not yet registered:
```javascript
pendingInvites: [
  {
    type: String,
    trim: true,
    lowercase: true
  }
]
```

### 2. Invitation Endpoint (`POST /api/boards/:boardId/invite`)
- **Controller:** `boardMemberController.js` → `inviteMember`
- **Logic:**
  ```mermaid
  graph TD
      A[Post Request with Email] --> B{Does User Exist?}
      B -- Yes --> C[Add to board.coworkers]
      C --> D[Send Standard Invite Email]
      C --> E[Notify Invited User]
      C --> F[Notify Board Owner]
      B -- No --> G{Already in pendingInvites?}
      G -- Yes --> H[Return 400 'User already invited']
      G -- No --> I[Add to board.pendingInvites]
      I --> J[Send Sign-up Invite Email]
      I --> K[Return success status]
  ```

### 3. Registration Endpoint (`POST /api/auth/register`)
- **Controller:** `authController.js` → `registerUser`
- **Logic:**
  1. Creates the user in the database.
  2. Searches the `Board` collection for any board containing `pendingInvites: cleanEmail`.
  3. For each matched board:
     - Appends the new user's `_id` to `board.coworkers`.
     - Removes the email from `board.pendingInvites`.
     - Saves the board.
     - Creates the welcome notification for the new user.
     - Creates the join notification for the board owner.

---

## 📬 Email Deliverability & SMTP Config

- **Delivery Account:** Authentic email address specified in `.env` (`EMAIL_USER` / `EMAIL_PASS`).
- **Reply-To Field:** Automatically populated with the Board Owner's email address. If the recipient replies to the registration email, their reply goes directly to the owner.
- **Spaces in Password Warning:** Ensure that the 16-character SMTP password has all spaces removed when pasted into `EMAIL_PASS` (e.g. `rsdnfgrzlohbnbmq` and not `rsdn fgrz lohb nbmq`).
