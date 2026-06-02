# TaskFlow Backend Technical Documentation

This document provides a detailed technical overview of the backend architecture, including descriptions of controllers, middleware, models, and utility functions.

---

## 1. Architecture Overview
TaskFlow follows the **MVC (Model-View-Controller)** pattern.
- **Models:** Define the data structure and business rules using Mongoose.
- **Controllers:** Contain the logic for handling requests and interacting with models.
- **Routes:** Map HTTP endpoints to specific controller functions.
- **Middleware:** Handle cross-cutting concerns like authentication and error handling.

---

## 2. Controllers & Methods

### Auth Controller (`authController.js`)
Handles user identity and session management.

*   `registerUser(req, res)`:
    *   Checks if the email is already in use.
    *   Hashes the password.
    *   Creates a new User and returns a JWT token.
    *   Scans for any boards containing the user's email in `pendingInvites`. If found, adds the user to the board's coworkers list, removes them from pending lists, and generates notifications for both the user and the board owner.
*   `loginUser(req, res)`:
    *   Validates credentials against the database.
    *   Returns a JWT token upon successful authentication.
*   `forgotPassword(req, res)`:
    *   Generates a secure, time-limited reset token.
    *   Saves hashed token and expiry to the User model.
    *   Dispatches a password reset email via `sendPasswordResetEmail`.
*   `resetPassword(req, res)`:
    *   Validates the reset token and its expiry.
    *   Hashes the new password and updates the user record.
    *   Clears the reset token fields.

### Board Controller (`boardController.js`)
Manages the lifecycle of project boards.

*   `createBoard(req, res)`: Creates a board and automatically initializes four default columns: "To Do", "In Progress", "Review", and "Done".
*   `getBoards(req, res)`: Retrieves all boards where the user is either the owner or a coworker, sorted by creation date.
*   `getBoardById(req, res)`: Fetches a specific board with fully populated columns and tasks.
*   `deleteBoard(req, res)`: Permanently removes a board along with all its associated columns and tasks.
*   `reorderColumns(req, res)`: Updates the column order array on the Board model and emits a `columns_reordered` socket event.

### Board Member Controller (`boardMemberController.js`)
Handles collaboration and permissions.

*   `getBoardMembers(req, res)`: Retrieves a list of all users (owner + coworkers) associated with a board. Enforces authorization checks via `hasBoardAccess`.
*   `inviteMember(req, res)`: Restricts invitations to board owners only. If the invited email exists, the user is added to `coworkers` immediately, and notifications are sent to both the user and the board owner. If the email is unregistered, it is saved to `pendingInvites`, and an email is dispatched inviting them to sign up. All emails utilize SMTP with the board owner's email in the `Reply-To` header.
*   `removeMember(req, res)`: Removes a user from the `coworkers` array. Restricts removal permissions to the board owner only, preventing coworkers from removing other members. Prevents removing the board owner.

### Column Controller (`columnController.js`)
Manages task groupings within boards.

*   `createColumn(req, res)`: Adds a new column to a board and updates the board's column reference list.
*   `getColumnsByBoard(req, res)`: Retrieves all columns for a specific board.
*   `updateColumn(req, res)`: Updates the title of an existing column. Explicitly destructures only `title` from `req.body` to prevent unauthorized field overwrites.
*   `deleteColumn(req, res)`: Removes a column and deletes all tasks contained within it.

### Task Controller (`taskController.js`)
The core logic for task management and real-time updates.

*   `createTask(req, res)`: Creates a task with optional fields like `label`, assigns it to a column, and triggers a `TASK_ASSIGNED` notification if an assignee is specified. Emits `task_created` socket event.
*   `getTask(req, res)`: Retrieves detailed information for a single task, including comments and populated activity log.
*   `getTaskActivity(req, res)`: Retrieves only the activity log for a specific task, populated with the usernames of actors. Enforces board access permissions.
*   `updateTask(req, res)`: Modifies task details (title, priority, etc.). Triggers `TASK_UPDATED` or `TASK_ASSIGNED` notifications as needed. Emits `task_updated` socket event and logs the change to `activityLog`.
*   `deleteTask(req, res)`: Removes a task and cleans up the reference in the parent column. Restricts task deletion to the board owner only. Emits `task_deleted` socket event.
*   `moveTask(req, res)`: Moves a task between columns. Synchronizes pointers and logs the move to `activityLog`. Emits `task_moved` socket event.
*   `reorderTask(req, res)`: Reorders tasks within a single column. Emits `tasks_reordered` socket event.
*   `getTasks(req, res)`: A versatile query method supporting search, priority filters, assignee filters, and date range filtering.

### Comment Controller (`commentController.js`)
Handles task-level discussions.

*   `addComment(req, res)`: Creates a comment and adds its reference to the Task model. Triggers a `COMMENT` notification for the task assignee. Emits `comment_added` socket event.
*   `getComments(req, res)`: Retrieves all comments for a specific task.
*   `deleteComment(req, res)`: Removes a comment and cleans up the reference in the Task model. Emits `comment_deleted` socket event.

---

## 3. Real-time Events (Sockets)

TaskFlow uses Socket.io for live collaboration. Events are broadcast to rooms named after the `boardId`.

| Event Name | Data Payload | Triggered By |
| :--- | :--- | :--- |
| `columns_reordered` | `{ columnIds }` | `reorderColumns` |
| `task_created` | `{ columnId, task, createdBy }` | `createTask` |
| `task_updated` | `{ taskId, updatedTask }` | `updateTask` |
| `task_deleted` | `{ taskId, columnId }` | `deleteTask` |
| `task_moved` | `{ taskId, sourceColumnId, destinationColumnId }` | `moveTask` |
| `tasks_reordered` | `{ columnId, taskIds }` | `reorderTask` |
| `comment_added` | `{ taskId, comment }` | `addComment` |
| `comment_deleted` | `{ taskId, commentId }` | `deleteComment` |

---

## 4. Middleware

### Auth Middleware (`authMiddleware.js`)
*   `protect`: A gatekeeper function that verifies the JWT in the `Authorization` header. It attaches the authenticated user object to `req.user`.

### Error Handler (`errorHandler.js`)
*   `errorHandler`: A centralized catch-all for errors. It provides specific formatting for:
    *   **ZodError:** Validation failures.
    *   **CastError:** Invalid MongoDB IDs.
    *   **MongoServerError (11000):** Duplicate key errors (e.g., duplicate emails).
    *   **JsonWebTokenError:** Authentication failures.

### Validation Middleware (`validate.js`)
*   `validate(schema)`: A factory function that returns a middleware using Zod to validate `req.body` or `req.query` before the controller logic executes.

---

## 5. Models (Schemas)

*   **User:** Stores credentials and profile info. Uses `bcrypt` for password hashing and has timestamps (`createdAt`, `updatedAt`) enabled automatically.
*   **Board:** Tracks ownership (`user`), collaborators (`coworkers`), and the ordered list of `columns`.
*   **Column:** Represents a vertical list. Holds a reference to the `board` and an ordered array of `tasks`.
*   **Task:** The central unit of work. Includes fields for `priority`, `dueDate`, `assignedTo`, `label`, `comments`, and `overdueEmailSent` (tracks daily overdue alert mail dispatch). Supports text indexing for search.
*   **Comment:** Simple text entries linked to a `task` and an `author`.
*   **Notification:** Persistent alerts for users. Stores `message`, `type`, and `relatedId` (e.g., a Task ID). Uses uppercase enums: `COMMENT`, `TASK_ASSIGNED`, `TASK_UPDATED`, `BOARD_INVITATION`.

---

## 6. Utilities

### Board Auth (`boardAuth.js`)
*   `hasBoardAccess(board, userId)`: Determines if a user has permission to view or modify a board. It handles both owner and coworker checks, safely unpacking both unpopulated ObjectIDs and populated User document objects.

### Socket Utility (`socket.js`)
*   `initSocket(server)`: Initializes the Socket.io instance.
*   `getIO()`: Provides access to the IO instance from anywhere in the application to emit events.

### Email Service (`emailService.js`)
*   `sendInviteEmail(toEmail, boardTitle, inviterName, inviterEmail)`: Sends a board invitation email using Nodemailer with a Reply-To pointing back to the board owner.
*   `sendPasswordResetEmail(toEmail, resetUrl)`: Dispatches password reset token links to the user.
*   `sendOverdueTaskEmail(toEmail, taskTitle, dueDate, boardTitle)`: Dispatches overdue notification emails to assignees or creators.

### Email Templates (`emailTemplates.js`)
*   `inviteTemplate`, `passwordResetTemplate`, `overdueTaskTemplate`: Branded, responsive HTML templates matching the project's visual identity.

### Cron Scheduler (`scheduledJobs.js`)
*   `initScheduledJobs()`: Schedules a daily cron task at midnight (`0 0 * * *`) that searches for incomplete overdue tasks, emails the assignee/creator, and sets `overdueEmailSent = true` to avoid duplicate emails.
