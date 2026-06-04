# TaskFlow Backend — Architecture Documentation

This document is the official structural guide for the TaskFlow backend. It details the system architecture, file organisation, data flow, security layers, and real-time communication model.

---

## 1. High-Level System Overview

TaskFlow is a collaborative project management tool built on the **MERN stack** (MongoDB, Express.js, React, Node.js). The frontend (React) and backend (Express) are fully decoupled: the frontend communicates with the backend exclusively over **REST APIs** (HTTP JSON) and **WebSocket events** (Socket.IO).

```
┌─────────────────────────────────────┐
│         React Frontend (SPA)         │
│  - Axios REST Requests               │
│  - Socket.IO client for live events  │
└───────────────┬─────────────────────┘
                │ HTTP + WebSocket
┌───────────────▼─────────────────────┐
│        Express.js Backend            │
│  ┌──────────────────────────────┐   │
│  │ Middleware Layer              │   │
│  │  Helmet · CORS · JSON Parser │   │
│  │  Auth Guard · Zod Validation │   │
│  │  Rate Limiters · Error Handler│  │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ Route → Controller Layer      │   │
│  │  Auth · Boards · Columns      │   │
│  │  Tasks · Comments · Notifs   │   │
│  │  AI · Member Management      │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ Socket.IO Hub (socket.js)    │   │
│  │  Board rooms · User rooms    │   │
│  │  Presence tracking           │   │
│  └──────────────────────────────┘   │
└───────────────┬─────────────────────┘
                │ Mongoose ODM
┌───────────────▼─────────────────────┐
│         MongoDB Atlas                │
│  Users · Boards · Columns · Tasks   │
│  Comments · Notifications            │
└─────────────────────────────────────┘
```

---

## 2. Directory Structure

The backend follows a **Route → Controller → Model (MVC)** pattern:

```
backend/
├── config/
│   └── db.js                    # Mongoose Atlas connection with retry logic
├── controllers/
│   ├── authController.js        # Registration, login, password reset
│   ├── aiController.js          # Gemini AI: suggest priority, auto-label, board insight, auto-prioritize
│   ├── boardController.js       # Board CRUD, column reordering
│   ├── boardMemberController.js # Invite, list, and remove coworkers
│   ├── columnController.js      # Column CRUD & cascade deletion
│   ├── commentController.js     # Task comments
│   ├── notificationController.js# Fetch, mark-read, and clear notifications
│   └── taskController.js        # Task CRUD, move, reorder, filters, activity log
├── docs/                        # This documentation folder
│   ├── API.md                   # Full HTTP endpoint reference
│   ├── architecture.md          # System design & data flow (this file)
│   ├── documentation.md         # Detailed controller & utility reference
│   ├── email-service.md         # Nodemailer & cron job documentation
│   ├── pending-invitations-flow.md # Board invitation workflow
│   ├── schema.md                # ER diagram & indexed field reference
│   └── userflow.md              # End-to-end user interaction flow
├── middleware/
│   ├── validators/              # Zod input schemas per resource
│   │   ├── authValidator.js
│   │   ├── boardValidator.js
│   │   ├── columnValidator.js
│   │   ├── commentValidator.js
│   │   └── taskValidator.js
│   ├── authMiddleware.js        # JWT Bearer token verification
│   ├── errorHandler.js          # Centralised error normaliser
│   ├── rateLimiter.js           # express-rate-limit: login, register, reset
│   └── validate.js              # Zod schema runner middleware factory
├── models/
│   ├── User.js
│   ├── Board.js
│   ├── Column.js
│   ├── Task.js
│   ├── Comment.js
│   └── Notification.js
├── routes/
│   ├── aiRoutes.js
│   ├── authRoutes.js
│   ├── boardRoutes.js
│   ├── columnRoutes.js
│   ├── commentRoutes.js
│   ├── notificationRoutes.js
│   └── taskRoutes.js
├── utils/
│   ├── boardAuth.js             # hasBoardAccess() permission helper
│   ├── emailService.js          # Nodemailer sending functions
│   ├── emailTemplates.js        # Branded HTML email templates
│   ├── notifyAndEmit.js         # Persist notification + emit via Socket.IO
│   ├── notifyOwner.js           # Conditionally notify board owner
│   ├── scheduledJobs.js         # Cron job for overdue task emails
│   └── taskHelpers.js           # getTaskWithBoardAccess() shared resolver
├── .env                         # Secrets (not committed)
├── .env.example                 # Documented environment variable template
├── server.js                    # App bootstrap: DB, cron, HTTP server, Socket.IO
├── socket.js                    # Socket.IO initialisation & room management
└── package.json
```

---

## 3. Application Bootstrap Flow

When `node server.js` (or `nodemon server.js`) starts:

```
1. dotenv.config()            → Load .env secrets into process.env
2. connectDB()                → Connect Mongoose to MongoDB Atlas
3. initScheduledJobs()        → Start node-cron overdue-task checker
4. Express middleware chain   → Helmet, CORS, JSON parser
5. Mount all route handlers   → /api/auth, /api/boards, /api/tasks, etc.
6. app.use(errorHandler)      → Attach centralised error handler last
7. http.createServer(app)     → Wrap Express in Node HTTP server
8. initIO(server)             → Attach Socket.IO to the same HTTP server
9. server.listen(PORT)        → Accept connections on port 5000
```

---

## 4. Security Architecture

### A. HTTP Header Security — Helmet
`helmet()` is applied as the first middleware, injecting security-critical HTTP response headers:
- `Content-Security-Policy` — restricts connections to allowed origins
- `X-Frame-Options` — prevents clickjacking
- `X-Content-Type-Options` — blocks MIME sniffing
- `Strict-Transport-Security` — enforces HTTPS (when in production)

### B. Cross-Origin Access — CORS
The CORS policy reads allowed origins from `process.env.ALLOWED_ORIGINS` (comma-separated). In development, it defaults to `http://localhost:5173` and `http://localhost:3000`. Credentials (cookies) are permitted so that future cookie-based flows work seamlessly.

### C. Rate Limiting — express-rate-limit
Three separate limiters protect authentication entry points from automated attacks:

| Limiter | Route | Limit | Window | Reason |
|---|---|---|---|---|
| `registerLimiter` | `POST /auth/register` | 5 requests | 1 hour | Prevents bulk account creation spam |
| `loginLimiter` | `POST /auth/login` | 10 requests | 15 minutes | Blocks brute-force credential attacks |
| `passwordResetLimiter` | `POST /auth/forgot-password` | 3 requests | 1 hour | Prevents SMTP resource exhaustion |

All limiters return standardised `{ success: false, error: "..." }` JSON and expose standard `RateLimit-*` headers.

### D. Input Validation — Zod
Every data-mutating endpoint passes through a `validate(schema)` middleware before reaching the controller. The Zod schemas:
- Type-check and coerce all incoming fields
- Validate ObjectID format using regex (prevents MongoDB operator injection)
- Trim strings and reject empty values
- Return specific field-level error messages on failure

### E. Authentication — JWT Bearer Tokens
- **Issuance:** On successful registration or login, `jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' })` generates a signed token.
- **Verification:** `authMiddleware.js` intercepts all protected routes. It extracts the `Bearer <token>` string, verifies the signature against `JWT_SECRET`, and attaches the decoded user object to `req.user`.
- **Password Storage:** Passwords are hashed using `bcryptjs` with 10 salt rounds inside a Mongoose `pre('save')` hook — they are never stored in plain text and are excluded from all queries via `select: false`.

### F. Enumeration Protection
The `POST /auth/forgot-password` endpoint always returns the same generic success message regardless of whether the email exists in the database. This prevents attackers from probing which email addresses are registered.

---

## 5. Data Architecture

### Collection Hierarchy
```
User
└── Board (owned by User; coworkers[] = User refs)
    └── Column (ordered by position)
        └── Task (back-reference to Column)
            ├── Comment (linked by Task.comments[])
            ├── Notification (linked by relatedId)
            └── activityLog[] (embedded sub-documents)
```

### Referential Integrity (Cascade Deletes)
Cascade purging is managed programmatically in controllers:
- **Deleting a Board** → deletes all its Columns and all their Tasks, Comments, and Notifications
- **Deleting a Column** → deletes all its Tasks, Comments, and Notifications
- **Deleting a Task** → deletes all its Comments and related Notifications

### Database Indexes
Performance-critical query paths are indexed at the schema level:

| Collection | Field(s) | Index Type | Query Optimised |
|---|---|---|---|
| `boards` | `user` | Single | Dashboard: boards owned by user |
| `boards` | `coworkers` | Multikey | Dashboard: shared boards lookup |
| `columns` | `board` | Single | Board page: fetch columns by board |
| `tasks` | `column` | Single | Column: fetch tasks by column |
| `tasks` | `assignedTo` | Single | Filter: tasks assigned to user |
| `tasks` | `priority` | Single | Filter: tasks by priority level |
| `tasks` | `title`, `description` | Text (compound) | Full-text search |
| `comments` | `task` | Single | Fetch comments for a task |
| `notifications` | `user` | Single | Fetch notifications for user |
| `notifications` | `isRead` | Single | Filter unread notifications |

---

## 6. Real-time Architecture (Socket.IO)

### Room Strategy
Socket.IO uses two room namespaces to prevent cross-tenant data leakage:

| Room | Format | Scope |
|---|---|---|
| Board room | `<boardId>` | All collaborative events (task/column changes) |
| User room | `user:<userId>` | Private notifications per user |

### Connection Lifecycle
1. Client connects to Socket.IO server
2. Client emits `join_board({ boardId, userId })` → socket joins both the board room and `user:<userId>` room; `User.isOnline` is set to `true` in MongoDB; `member_online` is broadcast to the board room
3. Client emits `leave_board(boardId)` → socket leaves board room (stays in user room)
4. On `disconnect` → server checks remaining sockets in `user:<userId>` room. If zero remain (all tabs closed), `User.isOnline` is set to `false` and `member_offline` is broadcast globally

### Socket Event Catalogue

| Event | Direction | Payload | Triggered By |
|---|---|---|---|
| `join_board` | Client → Server | `{ boardId, userId }` | Board page mount |
| `join_user` | Client → Server | `userId` | Login |
| `leave_board` | Client → Server | `boardId` | Board unmount |
| `member_online` | Server → Board Room | `{ userId, boardId }` | User joins board |
| `member_offline` | Server → Global | `{ userId }` | User closes all sessions |
| `new_notification` | Server → User Room | `{ notification }` | Any notification event |
| `columns_reordered` | Server → Board Room | `{ columnIds }` | reorderColumns |
| `column_added` | Server → Board Room | `{ column }` | createColumn |
| `column_updated` | Server → Board Room | `{ column }` | updateColumn |
| `column_deleted` | Server → Board Room | `{ columnId }` | deleteColumn |
| `task_created` | Server → Board Room | `{ columnId, task, createdBy }` | createTask |
| `task_updated` | Server → Board Room | `{ taskId, updatedTask }` | updateTask |
| `task_deleted` | Server → Board Room | `{ taskId, columnId }` | deleteTask |
| `task_moved` | Server → Board Room | `{ taskId, sourceColumnId, destinationColumnId }` | moveTask |
| `tasks_reordered` | Server → Board Room | `{ columnId, taskIds }` | reorderTask |
| `comment_added` | Server → Board Room | `{ taskId, comment }` | addComment |
| `comment_deleted` | Server → Board Room | `{ taskId, commentId }` | deleteComment |

---

## 7. Notification System

Notifications are always created by the `notifyAndEmit()` utility:
1. Creates a `Notification` document in MongoDB
2. Populates the `sender` field (so the UI gets the username immediately)
3. Emits `new_notification` to the recipient's `user:<id>` Socket.IO room

The `notifyOwner()` wrapper calls `notifyAndEmit()` but first checks if the actor and board owner are the same person — preventing self-notifications.

### Notification Types

| Type | When Triggered |
|---|---|
| `TASK_ASSIGNED` | A task is created with an assignee, or reassigned to a new user |
| `TASK_UPDATED` | Task details (title, priority, etc.) are modified, or a task is moved between columns |
| `TASK_MOVED_DONE` | Reserved in schema; no controller currently emits this type |
| `COMMENT` | A comment is posted on a task — sent to the assignee, the task creator, and the board owner |
| `BOARD_INVITATION` | A user is invited to join a board (sent to both the invited user and the board owner) |
| `OWNER_ALERT` | Owner is alerted when: a task is created, updated, or moved; a column is added, renamed, or reordered |
| `MEMBER_REMOVED` | A member is removed from a board |

---

## 8. Error Handling Flow

All errors funnel through `errorHandler.js` which is registered last in the middleware chain:

```
[Request] → [Rate Limiter] → [Zod Validation] → [Auth Guard] → [Controller]
                                    │                                  │
                            (ZodError thrown)            (Async error thrown)
                                    └─────────────┬────────────────────┘
                                                  ▼
                                         [errorHandler.js]
                                                  │
                              ┌───────────────────┼───────────────────┐
                              ▼                   ▼                   ▼
                        ZodError            CastError          MongoServerError
                    (Validation fail)   (Invalid ObjectID)   (11000 duplicate)
                              │                   │                   │
                              └───────────────────┴───────────────────┘
                                                  ▼
                              { success: false, error: "Friendly message" }
```

Express 5 automatically forwards rejected promise errors from async route handlers to `errorHandler.js` — no `try/catch` wrappers required in controllers.

---

## 9. AI Features (Gemini Integration)

Four AI-powered endpoints are available under `/api/ai` (authenticated):

- **`POST /api/ai/suggest-priority`** — Sends the task title and description to Google Gemini (`gemini-2.5-flash`). The model returns `high`, `medium`, or `low`, which is validated and returned to the client. Falls back to `medium` if the response is ambiguous.
- **`POST /api/ai/auto-label`** — Performs local keyword matching against a label dictionary (Bug, Frontend, Backend, etc.) and returns a suggested label without calling an external API.
- **`POST /api/ai/board-insight`** — Aggregates all tasks on a board and sends them to Gemini, which returns a single short insight summary (max 15 words) for display in the board banner. Gracefully degrades to a demo message on API quota exhaustion (HTTP 429).
- **`POST /api/ai/auto-prioritize`** — Sends all tasks on a board to Gemini in a single prompt and requests a JSON array of `{ id, priority }` objects, enabling bulk priority recalculation from the client.

---

## 10. Automated Background Jobs

`scheduledJobs.js` uses `node-cron` to run a daily background task at midnight (`0 0 * * *`):
1. Queries all incomplete tasks (`isDone: false`) with a past `dueDate` where `overdueEmailSent: false`
2. For each overdue task, sends an overdue notification email to the assignee (falls back to creator)
3. Sets `overdueEmailSent = true` on the task document to prevent duplicate daily emails
