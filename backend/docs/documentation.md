# TaskFlow Backend — Technical Documentation

This document provides detailed descriptions of all controllers, middleware, models, and utility functions in the TaskFlow backend.

---

## 1. Controllers

### Auth Controller (`controllers/authController.js`)

Manages user identity, session tokens, and password recovery.

#### `registerUser(req, res)`
Creates a new user account and returns an immediate JWT token.

**Step-by-step logic:**
1. Extracts `{ username, email, password }` from the validated request body.
2. Queries the database for an existing user matching either the email OR username — a single `$or` query prevents duplicate accounts.
3. Creates the User document. The `pre('save')` hook in `User.js` automatically hashes the password using `bcryptjs` with 10 salt rounds before storing it.
4. **Pending Invitation Resolution:** Queries all Board documents where `pendingInvites` contains the newly registered email address. For each matched board:
   - Adds the new user's `_id` to `board.coworkers`
   - Removes the email from `board.pendingInvites`
   - Saves the board
   - Sends a `BOARD_INVITATION` notification to the new user via `notifyAndEmit()`
   - Sends an `OWNER_ALERT` notification to the board owner via `notifyOwner()`
5. Signs and returns a JWT: `jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' })`

**Response:** `201 Created` with `{ _id, username, email, token }`

---

#### `loginUser(req, res)`
Authenticates an existing user.

**Step-by-step logic:**
1. Extracts `{ email, password }` from the validated request body.
2. Queries the User by email using `.select('+password')` — the password field is hidden by default (`select: false` in schema) and must be explicitly included for comparison.
3. Calls `user.matchPassword(password)` (instance method on User model using `bcrypt.compare`).
4. If credentials are valid, signs and returns a JWT.

**Security note:** Returns `401 Invalid email or password` for both non-existent email AND wrong password — a generic message that prevents user enumeration.

**Response:** `200 OK` with `{ _id, username, email, token }`

---

#### `forgotPassword(req, res)`
Initiates the password reset flow.

**Step-by-step logic:**
1. Looks up the user by email.
2. **Enumeration guard:** If the user is not found, still returns `200 OK` with a generic message.
3. Generates a random hex token using `crypto.randomBytes(20).toString('hex')`.
4. Hashes the token using `SHA-256` before storing it on the user document (prevents token exposure if the database is compromised).
5. Sets `resetPasswordExpire` to 10 minutes from now.
6. Saves the user and sends the **unhashed** token in the reset URL via `sendPasswordResetEmail()`.
7. **Rollback on email failure:** If the Brevo API call throws, the token and expiry are cleared from the user document before re-throwing, preventing orphaned reset tokens.

**Rate limiting:** Maximum 3 requests per hour per IP (`passwordResetLimiter`).

**Response:** `200 OK` with generic message regardless of email existence.

---

#### `resetPassword(req, res)`
Completes the password reset using the token from the email link.

**Step-by-step logic:**
1. Receives the raw token from `req.params.resetToken`.
2. Re-hashes the token with SHA-256 and looks up the matching user where `resetPasswordToken` equals the hash and `resetPasswordExpire` is greater than the current time.
3. If no user is found, the token is invalid or expired — returns `400 Bad Request`.
4. Sets the new password (triggering the pre-save hash hook), then clears `resetPasswordToken` and `resetPasswordExpire` from the document.

---

### Board Controller (`controllers/boardController.js`)

Manages the full lifecycle of project boards.

#### `createBoard(req, res)`
Creates a board and automatically scaffolds 4 default columns.

**Step-by-step logic:**
1. Creates the Board document with the authenticated user as owner.
2. Immediately creates 4 Column documents: **To Do** (position 0), **In Progress** (position 1), **Review** (position 2), **Done** (position 3).
3. Stores the 4 column ObjectIDs in `board.columns[]` and saves.
4. Returns the fully populated board (with columns embedded).

#### `getBoards(req, res)`
Returns all boards visible to the authenticated user.

Uses a `$or` query: `{ user: req.user._id }` (owner) OR `{ coworkers: req.user._id }` (member). Results are sorted by `createdAt` descending.

#### `getBoardById(req, res)`
Returns a single board with deep population.

Populates the full hierarchy in a single query chain:
- `board.columns` → populated as Column documents
- Each column's `tasks` → populated as Task documents (with `assignedTo.username` and `assignedTo.email`)
- Each task's `comments` → populated as Comment documents (with `author.username`)

Enforces access via `hasBoardAccess(board, req.user._id)`.

#### `deleteBoard(req, res)`
Permanently removes a board and all child data. Restricted to board owner only.

Cascade deletion order:
1. Find all columns belonging to the board
2. For each column, find all tasks → for each task, delete all Comments and related Notifications
3. Delete all Tasks, then all Columns, then the Board itself

#### `reorderColumns(req, res)`
Validates that all incoming `columnIds` belong to the current board (prevents foreign ID injection), then updates `board.columns` array and emits `columns_reordered` to the board's Socket.IO room.

---

### Board Member Controller (`controllers/boardMemberController.js`)

Handles collaborative membership and permissions.

#### `getBoardMembers(req, res)`
Returns the full user list for a board (owner + coworkers), populating `username` and `email` fields. Requires board access via `hasBoardAccess`.

#### `inviteMember(req, res)`
Adds a new collaborator to a board. **Restricted to board owner only.**

**Decision tree:**
```
Invite Email Received
        │
        ▼
Does a User with this email exist?
    ├── YES → Is user already a coworker?
    │              ├── YES → 400 "Already a member"
    │              └── NO  → Add to board.coworkers
    │                         → Send invite email (Reply-To = owner email)
    │                         → Notify invited user (BOARD_INVITATION)
    │                         → Notify owner (BOARD_INVITATION)
    └── NO  → Is email in board.pendingInvites?
                   ├── YES → 400 "User already invited"
                   └── NO  → Add to board.pendingInvites
                              → Send sign-up invite email
                              → 200 "Invitation email sent"
```

#### `removeMember(req, res)`
Removes a user from `board.coworkers`. **Restricted to board owner only.** Prevents the owner from removing themselves. On successful removal, sends a `MEMBER_REMOVED` notification to the removed user and emits a `member_removed` socket event to the board room.

---

### Column Controller (`controllers/columnController.js`)

Manages task groupings (lanes) within a board.

#### `createColumn(req, res)`
Creates a new Column and appends its `_id` to `board.columns[]`. Emits `column_added`. Triggers an `OWNER_ALERT` notification if the actor is not the board owner.

#### `getColumnsByBoard(req, res)`
Returns all columns for a board, populated with their tasks (including `assignedTo.username`).

#### `deleteColumn(req, res)`
Cascade-deletes the column and all its tasks (including task Comments and Notifications). Removes the column reference from `board.columns[]`. Emits `column_deleted`.

---

### Task Controller (`controllers/taskController.js`)

The central hub of TaskFlow's work management logic.

#### `createTask(req, res)`
Creates a task in the specified column.

- Appends the new task's `_id` to `column.tasks[]`
- If `assignedTo` is provided, sends a `TASK_ASSIGNED` notification to the assignee via `notifyAndEmit()`
- Sets `createdBy` to `req.user._id`
- Emits `task_created` to the board room

#### `getTask(req, res)`
Returns a single task with populated comments (including author username) and activity log. Uses `getTaskWithBoardAccess()` to verify board membership before returning data.

#### `getTaskActivity(req, res)`
Returns only the `activityLog` array for a task, with each entry's `performedBy` field populated with the actor's username. Enforces board access.

#### `updateTask(req, res)`
Updates task fields and generates granular activity log entries for each change.

**Change tracking logic:**
- If `title` changed → logs `"Title changed from 'Old' to 'New'"`
- If `priority` changed → logs `"Priority changed from 'medium' to 'high'"`
- If `description` changed → logs `"Description was updated"`
- If `dueDate` changed → logs `"Due date changed to [date]"` (or `"Due date removed"`)
- If `label` changed → logs `"Label changed to [label]"`
- If `assignedTo` changed → logs `"Assigned to [username]"` and sends `TASK_ASSIGNED` notification

Always emits `task_updated` to the board room.

#### `deleteTask(req, res)`
Deletes a task and its child Comments and Notifications. **Restricted to board owner only** — coworkers attempting this receive `403 Forbidden`. Removes the task's `_id` from `column.tasks[]`. Emits `task_deleted`.

#### `moveTask(req, res)`
Moves a task between columns atomically.

**Operations performed:**
1. Removes `taskId` from `sourceColumn.tasks[]`
2. Appends `taskId` to `destinationColumn.tasks[]`
3. Updates `task.column` to the destination column ID
4. If the destination column title is "done" (case-insensitive), sets `task.isDone = true`
5. Logs the move action to `activityLog`
6. Sends a `TASK_UPDATED` notification to the assignee (if set and not the actor)
7. Sends an `OWNER_ALERT` notification to the board owner (if not already notified as assignee)
8. Emits `task_moved` to the board room

#### `reorderTask(req, res)`
Validates that all incoming `taskIds` belong to the specified column (prevents injection), then replaces `column.tasks[]` with the new order. Emits `tasks_reordered`.

#### `getTasks(req, res)`
Flexible query endpoint supporting multiple simultaneous filters:

| Query Param | Effect |
|---|---|
| `boardId` (required) | Scope tasks to a specific board via column lookup |
| `columnId` | Narrow to a specific column |
| `assignedTo` | Filter by assignee ObjectID |
| `priority` | Filter by `low`, `medium`, or `high` |
| `search` | MongoDB `$text` search across `title` and `description` |
| `startDate` / `endDate` | Filter by due date range |

---

### Comment Controller (`controllers/commentController.js`)

Handles task-level discussions.

#### `addComment(req, res)`
Creates a `Comment` document and appends its `_id` to `task.comments[]`. Sends a `COMMENT` notification to both the task **assignee** and the task **creator** (deduped via a `Set`; the commenter is always excluded). Also sends a `COMMENT` notification to the board owner via `notifyOwner()` (type `"COMMENT"` is passed — not `OWNER_ALERT`). Emits `comment_added` to the board room.

#### `getComments(req, res)`
Returns all comments for a task sorted by `createdAt` descending (newest first), with `author.username` populated.

#### `deleteComment(req, res)`
Removes the comment document and cleans up its reference from `task.comments[]`. **Restricted to comment author or board owner.** Emits `comment_deleted`.

---

### Notification Controller (`controllers/notificationController.js`)

Serves and manages the in-app notification feed for each user.

| Method | Route | Description |
|---|---|---|
| `getNotifications` | `GET /notifications` | Returns the latest 30 notifications for `req.user._id`, sorted newest-first, with `sender.username` populated |
| `markAllAsRead` | `PATCH /notifications/read-all` | Sets `isRead: true` on all of the user's unread notifications |
| `markAsRead` | `PATCH /notifications/:id/read` | Sets `isRead: true` on a single notification; enforces ownership via `{ _id, user }` query |
| `deleteReadNotifications` | `DELETE /notifications/read` | Purges all notifications where `isRead: true` for the current user |
| `deleteNotification` | `DELETE /notifications/:id` | Deletes a specific notification; enforces ownership before deletion |

---

### AI Controller (`controllers/aiController.js`)

#### `suggestPriority(req, res)`
Sends the task's title and description to Google Gemini (`gemini-2.5-flash`) with a structured prompt asking it to return exactly one of: `high`, `medium`, or `low`. The response is sanitised (stripped of non-alphabetic characters) and validated against the allowed values before being returned. Falls back to `medium` if the model returns an unexpected response.

#### `autoLabel(req, res)`
Performs fast, local keyword matching without calling any external API. Scans the task title and description against 8 predefined keyword dictionaries (Bug, Frontend, Backend, Documentation, DevOps, Testing, Feature, Design). Returns the first matching label, or `Other` if no keywords match.

#### `getBoardInsight(req, res)`
Fetches all tasks for the specified board (via a deep `columns → tasks` populate), then sends the aggregated task data to Google Gemini with a prompt requesting a single short insight summary (max 15 words) suitable for a board banner. Returns a static placeholder if the board has no tasks. Gracefully degrades to a demo message string when the Gemini API returns a quota-exceeded (HTTP 429) error instead of propagating a 500.

#### `autoPrioritize(req, res)`
Bulk-analyses all tasks on a board using Google Gemini. Sends every task's `id`, `title`, `description`, `status` (column title), `dueDate`, and `currentPriority` in a single prompt and instructs the model to return a strict JSON array of `{ id, priority }` objects. The response is stripped of any Markdown code fences before JSON parsing, then forwarded directly to the client for batch-applying priority updates.

---

## 2. Middleware

### Auth Middleware (`middleware/authMiddleware.js`)

#### `protect`
Guards all private routes. Extracts the token from the `Authorization: Bearer <token>` header, verifies it with `jwt.verify()`, and attaches the user document to `req.user`. Returns `401 Unauthorized` for missing, malformed, or expired tokens.

### Rate Limiter (`middleware/rateLimiter.js`)

Three instances of `express-rate-limit`, each configured independently:

```js
// registerLimiter: 5 requests per hour per IP
// loginLimiter: 10 requests per 15 minutes per IP
// passwordResetLimiter: 3 requests per hour per IP
```

All limiters return `{ success: false, error: "..." }` with `standardHeaders: true` (exposes `RateLimit-*` headers to clients for countdown timers in the UI).

### Validation Middleware (`middleware/validate.js`)

Factory function: `validate(schema)` returns an Express middleware that calls `schema.parseAsync({ body: req.body, params: req.params, query: req.query })`. On success, the parsed (and potentially transformed/trimmed) values replace the originals on `req`. On failure, a `ZodError` is thrown and caught by `errorHandler.js`.

### Error Handler (`middleware/errorHandler.js`)

Registered as the **last middleware** in the chain. Normalises all error types into a consistent JSON response:

| Error Type | Detection | HTTP Status |
|---|---|---|
| Zod validation error | `err.name === 'ZodError'` | 400 |
| Invalid MongoDB ObjectID | `err.name === 'CastError'` | 400 |
| Duplicate key (unique index) | `err.code === 11000` | 400 |
| JWT invalid signature | `err.name === 'JsonWebTokenError'` | 401 |
| JWT expired | `err.name === 'TokenExpiredError'` | 401 |
| All other errors | Fallback | `err.statusCode` or 500 |

Never exposes raw stack traces in production (`NODE_ENV === 'production'`).

---

## 3. Models

### User (`models/User.js`)
```
username     String  required · unique · min 3 chars
email        String  required · unique · email format
password     String  required · min 6 · bcrypt hashed · select: false
isOnline     Boolean default: false (managed by Socket.IO)
resetPasswordToken   String · select: false
resetPasswordExpire  Date   · select: false
```
Instance method: `matchPassword(enteredPassword)` — calls `bcrypt.compare`.
Pre-save hook: hashes `password` whenever it is modified.

### Board (`models/Board.js`)
```
title          String    required
user           ObjectId  ref: User  (owner) · indexed
coworkers      ObjectId[] ref: User · indexed (multikey)
columns        ObjectId[] ref: Column
pendingInvites String[]  (lowercase email addresses)
```

### Column (`models/Column.js`)
```
title     String    required
board     ObjectId  ref: Board · indexed
position  Number    default: 0
tasks     ObjectId[] ref: Task
```

### Task (`models/Task.js`)
```
title            String    required · text-indexed
description      String    default: ''  · text-indexed
priority         String    enum: low|medium|high · default: medium · indexed
label            String    enum: Bug|Frontend|Backend|Documentation|DevOps|Design|Testing|Feature|Other · nullable
assignedTo       ObjectId  ref: User · nullable · indexed
dueDate          Date      nullable
column           ObjectId  ref: Column · required · indexed
comments         ObjectId[] ref: Comment
createdBy        ObjectId  ref: User · nullable
isDone           Boolean   default: false
overdueEmailSent Boolean   default: false
activityLog      []        embedded sub-documents { action, performedBy, timestamp }
```

### Comment (`models/Comment.js`)
```
content   String    required
task      ObjectId  ref: Task · indexed
author    ObjectId  ref: User · required
```

### Notification (`models/Notification.js`)
```
user       ObjectId  ref: User (recipient) · indexed
sender     ObjectId  ref: User · required
message    String    required
type       String    enum: COMMENT|TASK_ASSIGNED|TASK_UPDATED|BOARD_INVITATION|TASK_MOVED_DONE|OWNER_ALERT|MEMBER_REMOVED
relatedId  ObjectId  nullable (e.g. Task ID)
boardId    ObjectId  nullable
isRead     Boolean   default: false · indexed
```

---

## 4. Utilities

### `boardAuth.js` → `hasBoardAccess(board, userId)`
Determines if a user can view or modify a board. Accepts both populated documents (where `board.user` is a User object) and non-populated references (where `board.user` is a raw ObjectID string). Returns `true` if the userId matches the owner OR is present in `board.coworkers`.

### `notifyAndEmit.js` → `notifyAndEmit({ recipientId, senderId, message, type, relatedId, boardId })`
The single entry point for all notification creation:
1. Persists a `Notification` document to MongoDB
2. Populates the `sender` field (`username`, `email`) on the returned document
3. Emits `new_notification` via Socket.IO to `user:<recipientId>` room

### `notifyOwner.js` → `notifyOwner(board, actorId, message, type, relatedId)`
A thin wrapper around `notifyAndEmit`. Computes the board owner ID from `board.user` (handles both populated and non-populated references), then skips the notification if `actorId === boardOwnerId` (prevents self-notification). Errors are caught and logged — notification failures never crash the primary operation.

### `taskHelpers.js` → `getTaskWithBoardAccess(taskId, userId)`
Shared resolver used by task and comment controllers to reduce boilerplate:
1. Fetches the Task by `taskId` (throws 404 if not found)
2. Fetches the parent Column (throws 404 if orphaned)
3. Fetches the parent Board and checks `hasBoardAccess` (throws 403 if unauthorised)
4. Returns `{ task, column, board }` for the caller to use

### `emailService.js`
Wraps four Brevo API calls via `fetch`:
- `sendInviteEmail(toEmail, boardTitle, inviterName, inviterEmail)` — board invitation for registered user
- `sendUnregisteredInviteEmail(toEmail, boardTitle, inviterName, inviterEmail)` — sign-up invite for unregistered email
- `sendPasswordResetEmail(toEmail, resetUrl)` — password reset link
- `sendOverdueTaskEmail(toEmail, taskTitle, dueDate, boardTitle)` — overdue alert

### `emailTemplates.js`
Exports three branded, responsive HTML template strings: `inviteTemplate`, `passwordResetTemplate`, `overdueTaskTemplate`. All templates include the TaskFlow brand colours and support both light and dark email clients.

### `scheduledJobs.js` → `initScheduledJobs()`
Registers a daily `node-cron` job running at midnight (`0 0 * * *`):
- Queries: `{ isDone: false, dueDate: { $lt: now }, overdueEmailSent: false }`
- For each result: calls `sendOverdueTaskEmail()` → assignee if set, else creator
- Sets `task.overdueEmailSent = true` to prevent duplicate daily alerts

---

## 5. Testing

### Test Structure
The backend has a comprehensive test suite in `backend/tests/`:

```
tests/
├── controllers/          # Unit tests for all controllers (mocked DB)
├── integration/          # End-to-end tests against real MongoDB Atlas DB
│   ├── setup.js          # beforeAll/afterAll hooks: connect, cleanup, mock sockets
│   ├── auth.test.js      # Register, login, pending invites, rate limiting
│   ├── board.test.js     # Board CRUD, member invites, cascade deletes
│   ├── column.test.js    # Column CRUD, reorder, cascade deletes
│   ├── task.test.js      # Task CRUD, move, Done column logic
│   ├── comment.test.js   # Comment CRUD and sorting
│   └── notification.test.js # Notification retrieval, read, purge
├── middleware/           # Unit tests for authMiddleware, errorHandler, validate
├── utils/                # Unit tests for boardAuth, notifyAndEmit, notifyOwner, taskHelpers
├── validators/           # Unit tests for all Zod schemas
└── helpers.js            # Shared test utilities (fakeId, mockReq, mockRes)
```

### Running Tests
```bash
npm test   # jest --runInBand --detectOpenHandles
```
Tests run sequentially (`--runInBand`) to avoid parallel Atlas connection limits. The integration test setup includes a 3-retry connection loop to survive transient network drops.

**Results:** 255 unit and integration tests — all passing.
