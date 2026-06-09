# TaskFlow API Documentation

Complete reference for the TaskFlow REST API. All responses follow a consistent JSON structure.

## Base URL
```
http://localhost:5000/api
```

## Authentication
All routes except `/auth/register` and `/auth/login` require an active session via an httpOnly `token` cookie:
```
Cookie: token=<your_jwt_token>
```
Tokens are issued on registration and login and are valid for **30 days**.

## Standard Response Format

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "error": "A descriptive error message" }
```
Auth endpoints (`/auth/register`, `/auth/login`) return a flat structure (no `success` wrapper) for compatibility.

---

## Rate Limiting

Three endpoints enforce IP-based rate limiting:

| Endpoint | Limit | Window |
|---|---|---|
| `POST /auth/register` | 5 requests | 1 hour |
| `POST /auth/login` | 10 requests | 15 minutes |
| `POST /auth/forgot-password` | 3 requests | 1 hour |

Exceeded limits return `429 Too Many Requests` with `{ success: false, error: "..." }`.

---

## 1. Auth Endpoints

### Register User
```
POST /auth/register
```
Creates a new account. If the registered email matches any `pendingInvites`, the user is automatically added to those boards.

**Rate limit:** 5 requests/hour/IP

**Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Validation rules:**
- `username`: required, 3–30 characters, alphanumeric + underscores
- `email`: required, valid email format
- `password`: required, minimum 6 characters

**Response `201`:**
```json
{
  "_id": "60d5ec...",
  "username": "johndoe",
  "email": "john@example.com"
}
```
*(Also returns a `Set-Cookie` header containing the JWT session)*

**Error `400`:** Email or username already exists.

---

### Login User
```
POST /auth/login
```
Authenticates an existing user and returns a JWT token.

**Rate limit:** 10 requests/15 minutes/IP

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response `200`:**
```json
{
  "_id": "60d5ec...",
  "username": "johndoe",
  "email": "john@example.com"
}
```
*(Also returns a `Set-Cookie` header containing the JWT session)*

**Error `401`:** Invalid email or password (generic message — prevents user enumeration).

---

### Logout User
```
POST /auth/logout
```
Clears the user's `httpOnly` session cookie to securely log them out.

**Response `200`:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```
*(Also returns a `Set-Cookie` header to clear the token)*

---

### Get Current User (Me)
```
GET /api/auth/me
```
Retrieves the currently authenticated user's profile using the session cookie. Requires an active `httpOnly` cookie.

**Response `200`:**
```json
{
  "_id": "60d5ec...",
  "username": "johndoe",
  "email": "john@example.com"
}
```

---

### Forgot Password
```
POST /auth/forgot-password
```
Generates a 10-minute reset token and sends it to the user's email.

**Rate limit:** 3 requests/hour/IP

**Body:**
```json
{ "email": "john@example.com" }
```

**Response `200`:** Always returns a generic success message regardless of whether the email is registered.
```json
{
  "success": true,
  "data": "If an account exists with that email, a password reset link has been sent."
}
```

---

### Reset Password
```
POST /auth/reset-password/:resetToken
```
Completes the password reset using the token from the email link.

**Body:**
```json
{ "password": "newpassword123" }
```

**Response `200`:**
```json
{ "success": true, "data": "Password reset successful" }
```

**Error `400`:** Token is invalid or has expired.

---

## 2. Board Endpoints

All board endpoints require authentication.

### Create Board
```
POST /boards
```
Creates a new board and automatically initialises 4 default columns: **To Do**, **In Progress**, **Review**, **Done**.

**Body:**
```json
{ "title": "Project Alpha" }
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "60d5ee...",
    "title": "Project Alpha",
    "user": "60d5ec...",
    "columns": [
      { "_id": "...", "title": "To Do", "position": 0 },
      { "_id": "...", "title": "In Progress", "position": 1 },
      { "_id": "...", "title": "Review", "position": 2 },
      { "_id": "...", "title": "Done", "position": 3 }
    ],
    "coworkers": [],
    "pendingInvites": []
  }
}
```

---

### Get All Boards
```
GET /boards
```
Returns all boards where the user is owner or coworker.

**Response `200`:**
```json
{
  "success": true,
  "count": 2,
  "data": [...]
}
```

---

### Get Board By ID
```
GET /boards/:id
```
Returns a deeply populated board tree: board → columns → tasks (with assignees) → comments (with authors).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "60d5ee...",
    "title": "Project Alpha",
    "columns": [
      {
        "_id": "...",
        "title": "To Do",
        "tasks": [
          {
            "_id": "...",
            "title": "Fix login bug",
            "priority": "high",
            "assignedTo": { "_id": "...", "username": "johndoe" },
            "comments": [...]
          }
        ]
      }
    ]
  }
}
```

**Error `403`:** User is not a member of this board.

---

### Delete Board
```
DELETE /boards/:id
```
Permanently removes the board and all its columns, tasks, comments, and notifications (cascade delete).

**Access:** Board owner only.

**Response `200`:**
```json
{ "success": true, "message": "Board and all associated data removed" }
```

---

### Reorder Columns
```
PUT /boards/:boardId/reorder
```
Updates the display order of columns on a board. All provided IDs must belong to the board.

**Body:**
```json
{ "columnIds": ["60d5ef...", "60d5f2...", "60d5f0..."] }
```

**Response `200`:**
```json
{ "success": true, "data": ["60d5ef...", "60d5f2...", "60d5f0..."] }
```

---

## 3. Member Endpoints

### Get Board Members
```
GET /boards/:boardId/members
```
Returns the full list of board participants (owner + coworkers) with username and email.

**Response `200`:**
```json
[
  { "_id": "...", "username": "johndoe", "email": "john@example.com" },
  { "_id": "...", "username": "jane_doe", "email": "jane@example.com" }
]
```

---

### Invite Member
```
POST /boards/:boardId/invite
```
Invites a user to the board. **Board owner only.**

- If the email is **registered** → user is added to `coworkers` immediately and receives an invitation email + in-app notification.
- If the email is **unregistered** → email is added to `pendingInvites` and a sign-up invitation email is sent. Upon registration, the user is auto-added to the board.

**Body:**
```json
{ "email": "newuser@example.com" }
```

**Response `200` (registered user):**
```json
{
  "message": "User invited successfully",
  "coworkers": ["60d5ed...", "60d5f1..."]
}
```

**Response `200` (unregistered user):**
```json
{
  "message": "Invitation email sent to unregistered user. They will be added when they sign up."
}
```

**Error `403`:** Only the board owner can invite members.
**Error `400`:** User is already a member or already invited.

---

### Remove Member
```
DELETE /boards/:boardId/members/:memberId
```
Removes a coworker from the board. **Board owner only.** Owner cannot remove themselves.

**Response `200`:**
```json
{ "success": true, "message": "Member removed successfully" }
```

---

## 4. Column Endpoints

### Create Column
```
POST /columns
```
Adds a new column to an existing board.

**Body:**
```json
{
  "title": "Backlog",
  "boardId": "60d5ee..."
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "60d5f2...",
    "title": "Backlog",
    "board": "60d5ee...",
    "position": 0,
    "tasks": []
  }
}
```

---

### Get Columns for Board
```
GET /columns/board/:boardId
```
Returns all columns for a board with their tasks populated.

**Response `200`:**
```json
{ "success": true, "data": [...] }
```

---

### Delete Column
```
DELETE /columns/:id
```
Deletes the column and cascade-deletes all tasks, comments, and notifications within it.

**Response `200`:**
```json
{ "success": true, "message": "Column and associated tasks removed" }
```

---

## 5. Task Endpoints

### Create Task
```
POST /tasks
```
Creates a new task in the specified column.

**Body:**
```json
{
  "title": "Fix Auth Bug",
  "columnId": "60d5ef...",
  "description": "Token is not being cleared on logout",
  "priority": "high",
  "label": "Bug",
  "dueDate": "2024-12-31T12:00:00Z",
  "assignedTo": "60d5ed..."
}
```

**Accepted values:**
- `priority`: `low`, `medium`, `high` (default: `medium`)
- `label`: `Bug`, `Frontend`, `Backend`, `Documentation`, `DevOps`, `Design`, `Testing`, `Feature`, `Other`

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "60d5f3...",
    "title": "Fix Auth Bug",
    "column": "60d5ef...",
    "priority": "high",
    "label": "Bug",
    "isDone": false,
    "activityLog": []
  }
}
```

---

### Get Tasks (with Filters)
```
GET /tasks
```

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `boardId` | ObjectID | **Required.** Scope to a specific board |
| `columnId` | ObjectID | Filter by a specific column |
| `assignedTo` | ObjectID | Filter by assignee user ID |
| `priority` | string | `low`, `medium`, or `high` |
| `search` | string | Full-text search in title and description |
| `startDate` | ISO Date | Due date range start |
| `endDate` | ISO Date | Due date range end |

**Response `200`:**
```json
{
  "success": true,
  "count": 3,
  "data": [...]
}
```

---

### Get Task By ID
```
GET /tasks/:id
```
Returns a single task with populated comments and activity log.

**Response `200`:**
```json
{ "success": true, "data": { ... } }
```

---

### Get Task Activity Log
```
GET /tasks/:id/activity
```
Returns only the task's activity log with actor usernames populated.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "action": "Title changed from 'Old Title' to 'New Title'",
      "performedBy": { "_id": "...", "username": "johndoe" },
      "timestamp": "2024-10-27T10:00:00Z"
    }
  ]
}
```

---

### Update Task
```
PUT /tasks/:id
```
Updates task fields. Changes are automatically logged to `activityLog`.

**Body (any combination of fields):**
```json
{
  "title": "New Title",
  "priority": "medium",
  "description": "Updated description",
  "dueDate": "2024-12-31T00:00:00Z",
  "label": "Feature",
  "assignedTo": "60d5ed..."
}
```

**Response `200`:**
```json
{ "success": true, "data": { ... } }
```

---

### Move Task
```
PATCH /tasks/move
```
Moves a task from one column to another. Atomically updates both source and destination columns and the task's `column` reference. If the destination column is named "done" (case-insensitive), the task is marked `isDone: true`.

**Body:**
```json
{
  "taskId": "60d5f3...",
  "sourceColumnId": "60d5ef...",
  "destinationColumnId": "60d5f0..."
}
```

**Response `200`:**
```json
{ "success": true, "message": "Task moved successfully" }
```

---

### Reorder Tasks (Within Column)
```
PATCH /tasks/column/:columnId/reorder
```
Reorders tasks within a single column. All `taskIds` must belong to the specified column.

**Body:**
```json
{ "taskIds": ["60d5f3...", "60d5f5...", "60d5f4..."] }
```

**Response `200`:**
```json
{ "success": true, "data": ["60d5f3...", "60d5f5...", "60d5f4..."] }
```

---

### Delete Task
```
DELETE /tasks/:id
```
Deletes a task and cascade-deletes all associated comments and notifications.

**Access:** Board owner only.

**Response `200`:**
```json
{ "success": true, "message": "Task deleted successfully" }
```

**Error `403`:**
```json
{
  "success": false,
  "error": "Only the board owner can delete tasks. Contact your board owner to delete this task."
}
```

---

## 6. Comment Endpoints

### Add Comment
```
POST /tasks/:taskId/comments
```
Adds a comment to a task. Triggers a `COMMENT` notification to the task assignee.

**Body:**
```json
{ "content": "I am working on this." }
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "60d5f6...",
    "content": "I am working on this.",
    "task": "60d5f3...",
    "author": { "_id": "...", "username": "johndoe" },
    "createdAt": "2024-10-27T10:00:00Z"
  }
}
```

---

### Get Comments for Task
```
GET /tasks/:taskId/comments
```
Returns all comments for a task, sorted by creation date descending (newest first).

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "content": "...",
      "author": { "_id": "...", "username": "johndoe" },
      "createdAt": "..."
    }
  ]
}
```

---

### Delete Comment
```
DELETE /comments/:commentId
```
Deletes a comment. Restricted to the comment author or board owner.

**Response `200`:**
```json
{ "success": true, "message": "Comment deleted successfully" }
```

---

## 7. Notification Endpoints

### Get Notifications
```
GET /notifications
```
Returns all notifications for the authenticated user, sorted newest-first.

**Response `200`:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "...",
      "message": "johndoe assigned you to 'Fix Auth Bug'",
      "type": "TASK_ASSIGNED",
      "isRead": false,
      "sender": { "_id": "...", "username": "johndoe" },
      "createdAt": "2024-10-27T11:00:00Z"
    }
  ]
}
```

---

### Mark All as Read
```
PATCH /notifications/read-all
```

**Response `200`:**
```json
{ "success": true, "message": "All notifications marked as read" }
```

---

### Mark One as Read
```
PATCH /notifications/:id/read
```

**Response `200`:**
```json
{ "success": true, "data": { "_id": "...", "isRead": true, ... } }
```

---

### Delete Read Notifications
```
DELETE /notifications/read
```
Clears all notifications where `isRead: true` for the current user.

**Response `200`:**
```json
{ "success": true, "message": "Read notifications cleared" }
```

---

### Delete One Notification
```
DELETE /notifications/:id
```

**Response `200`:**
```json
{ "success": true, "message": "Notification deleted" }
```

---

## 8. AI Endpoints

All AI endpoints require authentication.

### Suggest Priority
```
POST /ai/suggest-priority
```
Uses Google Gemini (`gemini-2.5-flash`) to analyse the task title and description and recommend a priority level.

**Body:**
```json
{
  "title": "Fix login crash on mobile",
  "description": "App crashes on iOS 17 when submitting the login form"
}
```

**Response `200`:**
```json
{ "success": true, "priority": "high" }
```

**Notes:**
- Returns one of: `high`, `medium`, `low`
- Falls back to `medium` if the AI response is ambiguous
- Requires `GEMINI_API_KEY` in the environment

---

### Auto-Label
```
POST /ai/auto-label
```
Performs fast, local keyword matching to suggest a task label — no external API call required.

**Body:**
```json
{
  "title": "Update login page button styles",
  "description": "Change button colours to match new brand guide"
}
```

**Response `200`:**
```json
{ "success": true, "label": "Frontend" }
```

**Possible labels:** `Bug` · `Frontend` · `Backend` · `Documentation` · `DevOps` · `Testing` · `Feature` · `Design` · `Other`

---

### Board Insight
```
POST /ai/board-insight
```
Uses Google Gemini to analyse all tasks on a board and return a single short insight summary (max 15 words) for display in the board banner.

**Body:**
```json
{ "boardId": "60d5ee..." }
```

**Response `200`:**
```json
{ "insight": "3 high-priority tasks are overdue — review your backlog today." }
```

**Notes:**
- Returns `{ insight: "Add some tasks to see AI insights!" }` if the board has no tasks
- Falls back to a demo message if the Gemini API quota is exceeded (HTTP 429)
- Requires `GEMINI_API_KEY` in the environment

---

### Auto-Prioritize Board
```
POST /ai/auto-prioritize
```
Bulk re-calculates priority for all tasks on a board using Google Gemini. Returns an array of `{ id, priority }` objects that the client can use to batch-update task priorities.

**Body:**
```json
{ "boardId": "60d5ee..." }
```

**Response `200`:**
```json
{
  "priorities": [
    { "id": "60d5f3...", "priority": "high" },
    { "id": "60d5f4...", "priority": "low" }
  ]
}
```

**Notes:**
- Returns `{ priorities: [] }` if the board has no tasks
- Requires `GEMINI_API_KEY` in the environment
- The response is a raw JSON array parsed directly from the Gemini output

---

## 9. Error Reference

### HTTP Status Codes

| Code | Type | Description |
|---|---|---|
| `200` | OK | Request succeeded |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Validation failure, duplicate key, or business rule violation |
| `401` | Unauthorized | Missing, invalid, or expired JWT token |
| `403` | Forbidden | Authenticated but insufficient permissions |
| `404` | Not Found | Resource not found |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Server Error | Unexpected server-side error |

### Example Error Responses

**Validation failure (400):**
```json
{ "success": false, "error": "Username must be at least 3 characters long" }
```

**Token expired (401):**
```json
{ "success": false, "error": "Session expired, please log in again." }
```

**Permission denied (403):**
```json
{ "success": false, "error": "Only the board owner can invite members" }
```

**Rate limit exceeded (429):**
```json
{ "success": false, "error": "Too many login attempts, please try again later" }
```
