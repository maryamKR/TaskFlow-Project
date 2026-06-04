# TaskFlow — End-to-End User Flow

This document maps every interaction a user performs in TaskFlow to the backend operations it triggers, including REST API calls, database changes, Socket.IO events, and notifications.

---

## Phase 1: Registration & Login

### 1.1 New User Registration

**User action:** Submits the registration form with username, email, and password.

```
Client                          Backend                              Database
  │                                │                                    │
  │── POST /api/auth/register ────>│                                    │
  │   { username, email, password }│                                    │
  │                                │─ Validate (Zod) ─────────────────>│
  │                                │─ Check email/username uniqueness ─>│
  │                                │─ Create User (bcrypt hash on save)─>│
  │                                │─ Query pendingInvites ────────────>│
  │                                │  (if matches found)                │
  │                                │  ├─ Add user to board.coworkers   >│
  │                                │  ├─ Remove from pendingInvites    >│
  │                                │  ├─ Create BOARD_INVITATION notif >│
  │                                │  └─ Create BOARD_INVITATION notif     >│  (owner, via notifyOwner)
  │                                │─ Sign JWT (30d) ──────────────────│
  │<── 201 { _id, username, email, token } ───────────────────────────│
```

**Rate limit:** 5 requests/hour/IP. Exceeding returns `429`.

---

### 1.2 Login

**User action:** Enters email and password on the login page.

```
Client                          Backend                              Database
  │                                │                                    │
  │── POST /api/auth/login ───────>│                                    │
  │   { email, password }          │                                    │
  │                                │─ Validate (Zod) ──────────────────│
  │                                │─ Find user by email (+password) ──>│
  │                                │─ bcrypt.compare(password, hash) ──│
  │                                │─ Sign JWT (30d) ──────────────────│
  │<── 200 { _id, username, email, token } ───────────────────────────│
```

**Client-side after login:**
1. Saves token to `localStorage`
2. Establishes Socket.IO connection with `socket.auth = { token }`
3. Emits `join_user(userId)` to subscribe to personal notification room

**Rate limit:** 10 requests/15 minutes/IP.

---

### 1.3 Password Reset Flow

```
STEP 1: Request Reset
  Client ── POST /auth/forgot-password { email } ──> Backend
  Backend: generates SHA-256 token → saves to User → sends email
  Response: always 200 (enumeration protection)

STEP 2: User clicks email link
  Browser navigates to: http://localhost:3000/reset-password/<raw_token>

STEP 3: Submit new password
  Client ── POST /auth/reset-password/:token { password } ──> Backend
  Backend: re-hashes token → looks up matching User with non-expired token
           → hashes new password → clears token fields → 200 OK
```

---

## Phase 2: Board Management

### 2.1 Create a Board

**User action:** Clicks "New Board" and enters a board title.

```
Client ── POST /api/boards { title } ──> Backend
Backend:
  1. Creates Board (user = req.user._id)
  2. Creates 4 Columns: "To Do" (pos 0), "In Progress" (pos 1), "Review" (pos 2), "Done" (pos 3)
  3. Sets board.columns = [col1._id, col2._id, col3._id, col4._id]
  4. Returns populated board with columns embedded
```

---

### 2.2 Load the Dashboard

**User action:** Navigates to the dashboard page.

```
Client ── GET /api/boards ──> Backend
Backend: Board.find({ $or: [{ user }, { coworkers }] }).sort({ createdAt: -1 })
  → Returns list of all boards owned by or shared with the user

For selected board:
Client ── GET /api/boards/:id ──> Backend
Backend: Deep population chain:
  board → columns → tasks (with assignedTo.username) → comments (with author.username)
```

---

### 2.3 Invite a Collaborator

**User action:** Opens board settings and enters a collaborator's email.

```
Client ── POST /api/boards/:boardId/invite { email } ──> Backend

Backend decision tree:
  ├── User found in DB?
  │   ├── YES → Already coworker? → 400
  │   │         NO → Add to coworkers
  │   │              → Send invite email (Reply-To = owner's email)
  │   │              → notifyAndEmit(user, BOARD_INVITATION) ──> Socket: new_notification
  │   │              → notifyOwner(board, OWNER_ALERT) ──────> Socket: new_notification
  │   └── NO  → Already in pendingInvites? → 400
  │             NO → Add to pendingInvites
  │                  → Send sign-up invite email
  │                  → 200 "Invitation email sent"
```

---

### 2.4 Remove a Collaborator

**User action:** Clicks "Remove" next to a member in board settings.

```
Client ── DELETE /api/boards/:boardId/members/:memberId ──> Backend
Backend:
  1. Verifies requester is board owner
  2. Removes memberId from board.coworkers
  3. notifyAndEmit(removedUser, MEMBER_REMOVED)
  4. getIO().to(boardId).emit('member_removed', { userId: memberId })
Response: { success: true, message: "Member removed successfully" }
```

---

## Phase 3: Real-time Board Collaboration

### 3.1 Opening a Board Page

**User action:** Navigates to a board URL.

```
1. GET /api/boards/:id                   → Loads full board tree
2. socket.emit('join_board', { boardId, userId })
   Backend:
   ├── socket.join(boardId)              → Joins board broadcast room
   ├── socket.join(`user:${userId}`)     → Joins personal notification room
   ├── User.findByIdAndUpdate(isOnline: true)
   └── socket.to(boardId).emit('member_online', { userId, boardId })
```

---

### 3.2 Column Operations

| Action | API Call | Socket Event Emitted |
|---|---|---|
| Add column | `POST /columns` | `column_added { column }` → board room |
| Rename/reposition | `PUT /columns/:id` | `column_updated { column }` → board room |
| Delete column | `DELETE /columns/:id` | `column_deleted { columnId }` → board room |
| Reorder columns | `PUT /boards/:id/reorder` | `columns_reordered { columnIds }` → board room |

**Note:** Cascade deletions on column delete remove all tasks, comments, and notifications silently. No socket event is emitted for the individual task deletions — the `column_deleted` event is sufficient for the frontend to remove the entire column and its contents from state.

---

### 3.3 Task Operations

| Action | API Call | Socket Event | Notifications |
|---|---|---|---|
| Create task | `POST /tasks` | `task_created { columnId, task, createdBy }` | `TASK_ASSIGNED` → assignee (if set) |
| Update task | `PUT /tasks/:id` | `task_updated { taskId, updatedTask }` | `TASK_ASSIGNED` (if reassigned), `TASK_UPDATED` (if other changes) |
| Delete task | `DELETE /tasks/:id` | `task_deleted { taskId, columnId }` | — |
| Move task | `PATCH /tasks/move` | `task_moved { taskId, sourceColumnId, destinationColumnId, isDone }` | `TASK_UPDATED` → assignee (if set); `OWNER_ALERT` → board owner |
| Reorder tasks | `PATCH /tasks/column/:id/reorder` | `tasks_reordered { columnId, taskIds }` | — |

---

### 3.4 Task Detail — Activity Log

**User action:** Opens a task card to view its history.

```
GET /api/tasks/:id/activity
  → Backend: getTaskWithBoardAccess(taskId, userId)
      ├── Fetch task → verify column → verify board membership (403 if fails)
      └── Return task.activityLog[] with performedBy.username populated

Activity log entries are written automatically by updateTask() and moveTask():
  - "Title changed from 'Old' to 'New'"
  - "Priority changed from 'medium' to 'high'"
  - "Description was updated"
  - "Due date changed to [date]" / "Due date removed"
  - "Label changed to [label]"
  - "Assigned to [username]"
  - "Task moved from [source column] to [destination column]"
```

---

### 3.5 Task Filtering & Search

**User action:** Uses the board filter bar (search, priority, assignee, date).

```
GET /api/tasks?boardId=...&priority=high&search=bug&assignedTo=...&startDate=...&endDate=...

Backend filter pipeline:
  1. boardId (required) → find all columnIds in that board
  2. Build MongoDB query object:
     ├── column: { $in: columnIds }         (always applied)
     ├── columnId: ...                      (if provided)
     ├── assignedTo: ObjectId               (if provided)
     ├── priority: "high"|"medium"|"low"    (if provided)
     ├── $text: { $search: searchString }   (if search provided)
     └── dueDate: { $gte: start, $lte: end }(if date range provided)
  3. Task.find(query).populate('assignedTo', 'username email')
  4. Return { success: true, count, data }
```

---

### 3.6 Comments

| Action | API Call | Socket Event | Notifications |
|---|---|---|---|
| Post comment | `POST /tasks/:taskId/comments` | `comment_added { taskId, comment }` | `COMMENT` → assignee + creator (deduped, commenter excluded); `COMMENT` → board owner |
| Delete comment | `DELETE /comments/:commentId` | `comment_deleted { taskId, commentId }` | — |

---

### 3.7 AI-Powered Task Assistance

**User action:** Clicks "Suggest Priority", "Auto-Label", "Board Insight", or "Auto-Prioritize".

```
Suggest Priority:
  Client ── POST /api/ai/suggest-priority { title, description } ──> Backend
  Backend ── Prompt ──> Google Gemini API ──> { priority: "high"|"medium"|"low" }
  Response: { success: true, priority: "high" }

Auto-Label:
  Client ── POST /api/ai/auto-label { title, description } ──> Backend
  Backend: Local keyword matching (no external API)
  Response: { success: true, label: "Bug" }

Board Insight:
  Client ── POST /api/ai/board-insight { boardId } ──> Backend
  Backend ── All board tasks ──> Google Gemini API ──> one-line summary (max 15 words)
  Response: { insight: "3 high-priority tasks are overdue — review your backlog today." }
  (Degrades gracefully to a demo message if Gemini quota is exceeded)

Auto-Prioritize:
  Client ── POST /api/ai/auto-prioritize { boardId } ──> Backend
  Backend ── All board tasks ──> Google Gemini API ──> JSON array of { id, priority }
  Response: { priorities: [{ "id": "...", "priority": "high" }, ...] }
```

---

## Phase 4: Notifications

### 4.1 Receiving Real-time Notifications

When any collaborative action triggers a notification:

```
Backend: notifyAndEmit({
  recipientId: "...",
  senderId: "...",
  message: "johndoe assigned you to 'Fix Bug'",
  type: "TASK_ASSIGNED",
  relatedId: taskId,
  boardId: boardId
})
  ├── Saves Notification to MongoDB
  ├── Populates sender.username
  └── io.to(`user:${recipientId}`).emit('new_notification', { notification })

Client: socket.on('new_notification', handler) → shows toast + updates badge count
```

---

### 4.2 Notification Management

| Action | Endpoint | Effect |
|---|---|---|
| View all | `GET /notifications` | Returns all notifications sorted newest-first |
| Mark all read | `PATCH /notifications/read-all` | Sets isRead: true for all |
| Mark one read | `PATCH /notifications/:id/read` | Sets isRead: true for one |
| Clear read | `DELETE /notifications/read` | Deletes all where isRead: true |
| Delete one | `DELETE /notifications/:id` | Deletes one notification |

---

## Phase 5: Background Automation

### 5.1 Daily Overdue Task Check (Cron Job)

Runs automatically every day at **midnight** server time (`0 0 * * *`):

```
node-cron trigger
  │
  ▼
Query: Task.find({ isDone: false, dueDate: { $lt: now }, overdueEmailSent: false })
  │
  └── For each overdue task:
        ├── Resolve email target: task.assignedTo?.email || task.createdBy?.email
        ├── sendOverdueTaskEmail(email, taskTitle, dueDate, boardTitle)
        └── task.overdueEmailSent = true → save()
             (prevents duplicate emails on subsequent days)
```

---

## Phase 6: Presence Tracking

### 6.1 User Goes Offline (All Tabs Closed)

```
Browser tab closed
  │
  ▼
socket.on('disconnect')
  │
  ├── userId = socket.data.userId
  ├── Query: io.in(`user:${userId}`).fetchSockets()
  │
  ├── remainingSockets.length > 0?
  │   ├── YES → User still has other tabs open. No action.
  │   └── NO  → User.findByIdAndUpdate(isOnline: false)
  │              io.emit('member_offline', { userId })
```

This **multi-tab buffer** ensures that refreshing the browser or switching tabs does not incorrectly mark the user as offline.

---

## Pending Invitation Flow (Detailed)

See [pending-invitations-flow.md](./pending-invitations-flow.md) for the complete step-by-step walkthrough and decision flowcharts for both registered and unregistered user invitation scenarios.

---

## Security Summary

| Layer | Mechanism | Protects Against |
|---|---|---|
| HTTP Headers | `helmet()` | XSS, clickjacking, MIME sniffing |
| CORS | `ALLOWED_ORIGINS` allowlist from env | Unauthorised cross-origin requests |
| Rate limiting — register | `registerLimiter` (5/hr/IP) | Registration spam & DB pollution |
| Rate limiting — login | `loginLimiter` (10/15min/IP) | Credential brute-force attacks |
| Rate limiting — reset | `passwordResetLimiter` (3/hr/IP) | SMTP abuse, token flood |
| Input validation | Zod schemas (all mutations) | Malformed data, MongoDB operator injection |
| Authentication | JWT Bearer tokens (30-day) | Unauthorised API access |
| Password storage | `bcryptjs` (10 salt rounds) | Rainbow table attacks |
| Enumeration guard | Generic 200 on forgot-password | Probing registered email addresses |
| Access control | `hasBoardAccess()` + owner checks | Privilege escalation by coworkers |
| Socket isolation | Board rooms + `user:<id>` rooms | Cross-board real-time data leakage |
| Cascade integrity | Programmatic cascade deletes | Orphaned documents after parent deletion |
