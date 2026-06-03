# TaskFlow — Database Schema

> **MongoDB / Mongoose**  
> All `ObjectId` references are shown as foreign-key relationships.  
> `timestamps: true` adds `createdAt` and `updatedAt` to every collection.

---

## Entity-Relationship Diagram

```mermaid
erDiagram

    USER {
        ObjectId  _id                  PK
        string    username             "required · unique · min 3"
        string    email                "required · unique · email format"
        string    password             "required · min 6 · bcrypt hashed · select:false"
        boolean   isOnline             "default: false"
        string    resetPasswordToken   "select:false"
        date      resetPasswordExpire  "select:false"
        date      createdAt
        date      updatedAt
    }

    BOARD {
        ObjectId    _id            PK
        string      title          "required"
        ObjectId    user           FK "owner → User · indexed"
        ObjectId[]  coworkers      FK "members → User[] · indexed (multikey)"
        ObjectId[]  columns        FK "ordered refs → Column[]"
        string[]    pendingInvites "email addresses (lowercase)"
        date        createdAt
        date        updatedAt
    }

    COLUMN {
        ObjectId    _id      PK
        string      title    "required"
        ObjectId    board    FK "parent → Board · indexed"
        number      position "default: 0"
        ObjectId[]  tasks    FK "ordered refs → Task[]"
        date        createdAt
        date        updatedAt
    }

    TASK {
        ObjectId    _id              PK
        string      title            "required · text-indexed"
        string      description      "default: '' · text-indexed"
        string      priority         "enum: low|medium|high · default: medium · indexed"
        string      label            "enum: Bug|Frontend|Backend|Documentation|DevOps|Design|Testing|Feature|Other · nullable"
        ObjectId    assignedTo       FK "→ User (nullable) · indexed"
        date        dueDate          "nullable"
        ObjectId    column           FK "parent → Column · required · indexed"
        ObjectId[]  comments         FK "→ Comment[]"
        ObjectId    createdBy        FK "→ User (nullable)"
        boolean     isDone           "default: false"
        boolean     overdueEmailSent "default: false"
        object[]    activityLog      "embedded sub-documents"
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
        ObjectId  task      FK "parent → Task · indexed"
        ObjectId  author    FK "→ User · required"
        date      createdAt
        date      updatedAt
    }

    NOTIFICATION {
        ObjectId  _id       PK
        ObjectId  user      FK "recipient → User · indexed"
        ObjectId  sender    FK "→ User · required"
        string    message   "required"
        string    type      "enum: COMMENT|TASK_ASSIGNED|TASK_UPDATED|BOARD_INVITATION|TASK_MOVED_DONE|OWNER_ALERT|MEMBER_REMOVED"
        ObjectId  relatedId FK "→ Task (nullable)"
        ObjectId  boardId   FK "→ Board (nullable)"
        boolean   isRead    "default: false · indexed"
        date      createdAt
        date      updatedAt
    }

    %% ── Relationships ──────────────────────────────────────────
    USER         ||--o{ BOARD             : "owns"
    USER         }o--o{ BOARD            : "member of (coworkers)"
    BOARD        ||--|{ COLUMN            : "has columns"
    COLUMN       ||--|{ TASK              : "has tasks"
    TASK         ||--o{ COMMENT           : "has comments"
    TASK         }o--o| USER              : "assigned to"
    TASK         }o--o| USER              : "created by"
    TASK         ||--o{ ACTIVITY_LOG_ENTRY : "activity log"
    ACTIVITY_LOG_ENTRY }o--o| USER        : "performed by"
    COMMENT      }o--|| USER              : "authored by"
    NOTIFICATION }o--|| USER              : "recipient"
    NOTIFICATION }o--|| USER              : "sender"
    NOTIFICATION }o--o| TASK              : "related task"
    NOTIFICATION }o--o| BOARD             : "related board"
```

---

## Collections Summary

| Collection | Documents | Key Relationships |
|---|---|---|
| `users` | Auth accounts & profiles | Referenced by all other collections |
| `boards` | Kanban boards | Owned by 1 User · N coworkers · N Columns |
| `columns` | Board lanes / swim lanes | Belongs to 1 Board · ordered by `position` |
| `tasks` | Work items | Belongs to 1 Column · assigned to 1 User · has N Comments |
| `comments` | Task discussions | Belongs to 1 Task · authored by 1 User |
| `notifications` | In-app alerts | Recipient + Sender are Users · links to Task and/or Board |

---

## Indexes

| Collection | Field(s) | Index Type | Query Optimised |
|---|---|---|---|
| `boards` | `user` | Single | Dashboard: boards owned by user |
| `boards` | `coworkers` | Multikey | Dashboard: boards where user is a member |
| `columns` | `board` | Single | Board page: fetch columns by board |
| `tasks` | `column` | Single | Column view: fetch tasks by column |
| `tasks` | `title`, `description` | Text (compound) | Full-text task search |
| `tasks` | `assignedTo` | Single | Filter: tasks assigned to a user |
| `tasks` | `priority` | Single | Filter: tasks by priority level |
| `comments` | `task` | Single | Fetch all comments for a task |
| `notifications` | `user` | Single | Fetch notifications for a recipient |
| `notifications` | `isRead` | Single | Filter unread notifications |

---

## Notification Types

| Type | Trigger |
|---|---|
| `COMMENT` | A comment is posted on a task |
| `TASK_ASSIGNED` | A task is assigned or reassigned to a user |
| `TASK_UPDATED` | Task details (title, priority, etc.) are modified |
| `BOARD_INVITATION` | A user is invited to or auto-joined a board |
| `TASK_MOVED_DONE` | A task is moved into a column with "done" in its name |
| `OWNER_ALERT` | Board owner receives an alert (member joined, column added) |
| `MEMBER_REMOVED` | A coworker is removed from a board |

---

## Task Labels & Priority

**Priority** `low` · `medium` *(default)* · `high`

**Labels** `Bug` · `Frontend` · `Backend` · `Documentation` · `DevOps` · `Design` · `Testing` · `Feature` · `Other`

---

## Schema Validation Notes

- `Board.pendingInvites` stores emails in lowercase (enforced by schema `lowercase: true` + `trim: true`)
- `Task.column` is a **required** back-reference — every task must always belong to exactly one column
- `Task.overdueEmailSent` is set to `true` by the cron job after sending the first overdue alert, preventing repeated daily emails
- `User.isOnline` is managed exclusively by Socket.IO connection/disconnect events — never set manually in controllers
