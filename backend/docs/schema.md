# TaskFlow — Database Schema

> **MongoDB / Mongoose** — Entity-Relationship Diagram  
> All `ObjectId` references are shown as foreign-key relationships.  
> `timestamps: true` adds `createdAt` and `updatedAt` to every collection.

---

## Entity-Relationship Diagram

```mermaid
erDiagram

    USER {
        ObjectId  _id           PK
        string    username      "required · unique · min 3"
        string    email         "required · unique · email format"
        string    password      "required · min 6 · select:false"
        string    resetPasswordToken   "select:false"
        date      resetPasswordExpire  "select:false"
        boolean   isOnline      "default: false"
        date      createdAt
        date      updatedAt
    }

    BOARD {
        ObjectId    _id           PK
        string      title         "required"
        ObjectId    user          FK "owner → User"
        ObjectId[]  coworkers     FK "members → User[]"
        ObjectId[]  columns       FK "ordered refs → Column[]"
        string[]    pendingInvites "email addresses"
        date        createdAt
        date        updatedAt
    }

    COLUMN {
        ObjectId    _id      PK
        string      title    "required"
        ObjectId    board    FK "parent → Board"
        number      position "default: 0"
        ObjectId[]  tasks    FK "ordered refs → Task[]"
        date        createdAt
        date        updatedAt
    }

    TASK {
        ObjectId    _id             PK
        string      title           "required · text-indexed"
        string      description     "default: '' · text-indexed"
        string      priority        "enum: low | medium | high · default: medium"
        string      label           "enum: Bug|Frontend|Backend|Documentation|DevOps|Design|Testing|Feature|Other"
        ObjectId    assignedTo      FK "→ User (nullable)"
        date        dueDate         "nullable"
        ObjectId    column          FK "parent → Column"
        ObjectId[]  comments        FK "→ Comment[]"
        ObjectId    createdBy       FK "→ User (nullable)"
        boolean     isDone          "default: false"
        boolean     overdueEmailSent "default: false"
        object[]    activityLog     "embedded sub-docs"
        date        createdAt
        date        updatedAt
    }

    ACTIVITY_LOG_ENTRY {
        string    action      "required"
        ObjectId  performedBy FK "→ User"
        date      timestamp   "default: Date.now"
    }

    COMMENT {
        ObjectId  _id       PK
        string    content   "required"
        ObjectId  task      FK "parent → Task"
        ObjectId  author    FK "→ User"
        date      createdAt
        date      updatedAt
    }

    NOTIFICATION {
        ObjectId  _id       PK
        ObjectId  user      FK "recipient → User"
        ObjectId  sender    FK "→ User"
        string    message   "required"
        string    type      "enum: COMMENT|TASK_ASSIGNED|TASK_UPDATED|BOARD_INVITATION|TASK_MOVED_DONE|OWNER_ALERT"
        ObjectId  relatedId FK "→ Task (nullable)"
        ObjectId  boardId   FK "→ Board (nullable)"
        boolean   isRead    "default: false · indexed"
        date      createdAt
        date      updatedAt
    }

    %% ── Relationships ──────────────────────────────────────────
    USER         ||--o{ BOARD        : "owns"
    USER         }o--o{ BOARD        : "member of (coworkers)"
    BOARD        ||--|{ COLUMN       : "has columns"
    COLUMN       ||--|{ TASK         : "has tasks"
    TASK         ||--o{ COMMENT      : "has comments"
    TASK         }o--o| USER         : "assigned to"
    TASK         }o--o| USER         : "created by"
    TASK         ||--o{ ACTIVITY_LOG_ENTRY : "activity log"
    ACTIVITY_LOG_ENTRY }o--o| USER   : "performed by"
    COMMENT      }o--|| USER         : "authored by"
    NOTIFICATION }o--|| USER         : "recipient"
    NOTIFICATION }o--|| USER         : "sender"
    NOTIFICATION }o--o| TASK         : "related task"
    NOTIFICATION }o--o| BOARD        : "related board"
```

---

## Collections Summary

| Collection | Documents | Key Relationships |
|---|---|---|
| `users` | Auth accounts | Referenced by all other collections |
| `boards` | Kanban boards | Owned by 1 User · many coworkers · many Columns |
| `columns` | Board lanes | Belongs to 1 Board · ordered by `position` |
| `tasks` | Work items | Belongs to 1 Column · assigned to 1 User · has Comments |
| `comments` | Task comments | Belongs to 1 Task · authored by 1 User |
| `notifications` | In-app alerts | Recipient + Sender are Users · links to Task/Board |

---

## Indexes

| Collection | Field(s) | Type | Purpose |
|---|---|---|---|
| `boards` | `user` | Single | Fast lookup of boards by owner |
| `columns` | `board` | Single | Fast lookup of columns by board |
| `tasks` | `column` | Single | Fast lookup of tasks by column |
| `tasks` | `title`, `description` | Text (compound) | Full-text search across tasks |
| `comments` | `task` | Single | Fast lookup of comments by task |
| `notifications` | `user` | Single | Fast lookup of notifications by recipient |
| `notifications` | `isRead` | Single | Fast filtering of unread notifications |

---

## Notification Types

| Type | Trigger |
|---|---|
| `COMMENT` | A comment is posted on a task |
| `TASK_ASSIGNED` | A task is assigned to a user |
| `TASK_UPDATED` | Task details are modified |
| `BOARD_INVITATION` | A user is invited to a board |
| `TASK_MOVED_DONE` | A task is moved to a "done" column |
| `OWNER_ALERT` | Board owner receives an alert (e.g. overdue) |

---

## Task Labels & Priority

**Priority** `low` · `medium` *(default)* · `high`

**Labels** `Bug` · `Frontend` · `Backend` · `Documentation` · `DevOps` · `Design` · `Testing` · `Feature` · `Other`
