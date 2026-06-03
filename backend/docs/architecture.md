# TaskFlow Backend Architecture Documentation

This document serves as the official structural guide for the TaskFlow backend. 
It details the system architecture, file organization, data flow, and security layers.

---

## 1. High-Level System Architecture

TaskFlow uses a decoupled client-server architecture built on the MERN stack (MongoDB, Express, React, Node.js).

## 2. Directory Structure

The backend follows a **Route-Controller-Model (MVC)** architectural pattern to ensure separation of concerns:

```text
backend/
├── config/             # Database connection setups (db.js)
├── controllers/        # Request handlers (processes inputs, executes DB actions)
│   ├── authController.js
│   ├── boardController.js
│   ├── boardMemberController.js # Handles coworker invitations/listing
│   ├── columnController.js
│   ├── taskController.js
│   ├── commentController.js     # Handles task discussions
│   └── notificationController.js # Handles user alerts
├── middleware/         # Request interceptors & security guards
│   ├── validators/     # Request payload Zod validation blueprints
│   │   ├── authValidator.js
│   │   ├── boardValidator.js
│   │   ├── columnValidator.js
│   │   └── taskValidator.js
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   └── validate.js     # Shared Zod validation executor
├── models/             # Database schemas & Mongoose ODM models
│   ├── User.js
│   ├── Board.js
│   ├── Column.js
│   ├── Task.js
│   ├── Comment.js
│   └── Notification.js
├── routes/             # API Endpoints mapping HTTP verbs to controllers
│   ├── authRoutes.js
│   ├── boardRoutes.js
│   ├── columnRoutes.js
│   ├── taskRoutes.js
│   ├── commentRoutes.js
│   └── notificationRoutes.js
├── utils/              # Shared helper functions
│   ├── authHelpers.js  # Password hashing & security utils
│   ├── boardAuth.js    # Permission & access logic
│   ├── emailService.js # Nodemailer mailer functions
│   ├── emailTemplates.js # Branded HTML email templates
│   └── scheduledJobs.js # Cron scheduler for automated jobs
├── .env                # Local environment secrets (DB strings, JWT secret)
├── API.md              # Detailed API documentation & examples
├── docs/               # Sub-system documentation
│   └── email-service.md # Documentation of the mailer/cron setups
├── documentation.md    # Developer-focused technical breakdown
├── server.js           # Application entry point & middleware registration
├── socket.js           # Real-time event hub (Socket.io)
└── package.json        # Node.js project dependencies


```

## 3. Core Architectural Layers

### A. Security & Authentication Layer
- **Payload Validation (Zod):** Request bodies are parsed and validated against Zod schemas at the routing layer before reaching the controllers. This ensures strict data typing for both resource creation (POST) and updates (PUT/PATCH).
- **Password Hashing:** Passwords are never stored in plain text. Secure hashing is managed via the `authHelpers.js` utility using `bcryptjs` (10 salts) before user creation or login.
- **Session Tracking:** Stateless authentication using JSON Web Tokens (JWT). Upon valid login/registration, the server issues a signed token valid for 30 days.
- **Route Guarding:** The `authMiddleware.js` file intercepts requests to protected routes. It extracts the `Bearer <token>` from the HTTP Authorization header, verifies it, and attaches the user payload to `req.user`.
- **Rate Limiting:** Critical endpoints like password resets are protected by `express-rate-limit`. This prevents brute-force attacks and SMTP resource exhaustion by limiting requests (e.g., 3 per hour per IP for password resets).
- **Enumeration Protection:** Public endpoints like `forgot-password` return generic success messages regardless of whether the target email exists in the system. This prevents attackers from verifying the presence of specific users.

### B. Collaboration & Member Management
TaskFlow supports multi-user collaboration on boards:
- **Ownership:** Every board has a primary `user` (owner) who has full administrative rights (e.g., deleting the board, inviting members, removing coworkers). Coworkers cannot remove other members.
- **Coworkers:** Owners can invite coworkers via email. If the invited email corresponds to an existing registered user, they are added to the board's `coworkers` list immediately. If the user is unregistered, the email is saved to the board's `pendingInvites` list, and an email is sent inviting them to register. Upon signup, the new user is automatically converted to an active coworker.
- **Access Control:** The `boardAuth.js` utility provides a `hasBoardAccess` check that allows both the owner and coworkers to view and modify columns/tasks on the board. Destructive actions like board deletion, column deletion, and task deletion are strictly reserved for the board owner. Task deletion attempts by non-owners result in a 403 Forbidden error.
- **Join Notifications:** When a coworker joins a board (either immediately upon invitation if already registered, or upon account creation if invited while unregistered), a `BOARD_INVITATION` notification is generated for the invited user, and a corresponding join notification is created for the board owner to notify them that the coworker has successfully joined.

### C. Data Layer & Relational Schema Tree
TaskFlow enforces a hierarchical MongoDB relational document pattern with bidirectional references to ensure data integrity:
- **User:** Root identity. It utilizes standard Mongoose timestamps (`createdAt`, `updatedAt`) for automated audit tracking.
- **Board:** Parent container referencing an owning User, an array of Column ObjectIDs, an array of coworker User ObjectIDs, and an array of `pendingInvites` emails.
- **Column:** Middle structural tier referencing its parent Board and containing an ordered array of Task ObjectIDs.
- **Task:** The work node containing metadata (including a categorizing `label` string). It maintains a **back-reference** to its parent Column (indexed for performance) to ensure every task has a single, verifiable source of truth for its location. It also tracks whether an overdue notification has been sent via the `overdueEmailSent` field.

### D. Automated Data Linkage & Deep Population
The system uses explicit controller logic to maintain atomic operations:
- **Pointer Synchronization:** During task movement, the system updates both the parent Column arrays and the task's internal column reference, preventing data desynchronization.
- **Reordering Integrity:** When columns or tasks are reordered, the request is validated to ensure that all incoming IDs belong to the parent Board/Column, preventing foreign ObjectID injection.
- **Nested Sub-Document Population:** To avoid making multiple round-trips, the system relies on **Deep Population**. Calling a board loads the root element and recursively populates the column and task hierarchies into a single nested tree for the frontend.

### E. Real-time Event Layer (Socket.io)
TaskFlow provides a collaborative "live" experience using a dedicated Socket.io implementation (`socket.js`):
- **Room-Based Isolation:** Users join board-specific rooms using their credentials (validated against board membership). Real-time events are confined to these rooms to prevent cross-board data leakage.
- **Event-Driven UI:** When a state-altering or layout-altering action occurs (e.g., `columns_reordered`, `task_created`, `task_updated`, `task_deleted`, `task_moved`, `tasks_reordered`, `comment_added`, `comment_deleted`), the server emits an event to the specific room. The frontend listens for these events to update its state instantly without a page refresh.

### F. Notification & Commenting Systems
Beyond core task management, TaskFlow provides auxiliary services to drive engagement:
- **Asynchronous Notifications:** Actions like assigning a task, updating task details, or inviting a member trigger the creation of a `Notification` document. These are served to the specific target user via the `notificationController.js`.
- **Task Discussions:** Users can add comments to any task. These are stored as separate `Comment` documents and linked to the `Task` model, enabling persistent threaded conversations.

### G. Automated & Transactional Email Layer
The system uses Nodemailer to send emails, matching the application's style guide:
- **Nodemailer Transporter:** Configured with platform SMTP credentials (`EMAIL_USER`, `EMAIL_PASS`) from the environment variables.
- **Board Invitation Mailer:** Automatically triggered when a board owner invites a member. The email is sent from the platform address, but the `Reply-To` header is set to the inviter's email to facilitate direct communication.
- **Overdue Task Cron Job:** Powered by `node-cron`, a background task runs daily at midnight (`0 0 * * *`) searching for incomplete, overdue tasks. It emails the assignee (falling back to the creator) and updates the task's `overdueEmailSent` state to avoid double alerts.
- **Password Reset Mailer:** Sends time-limited reset tokens to users who request them.


## 4. Error Handling Flow
To prevent server runtime crashes and keep error patterns predictable, the backend implements a centralized interception flow:

 ```text
[Incoming Request] ──> [Zod Validation] ──(Fails)───────────────────────┐
                            │                                           │
                         (Passes)                                       ▼
                            ▼                                  [errorHandler.js] ──> [Clean JSON Response]
                 [Controller Operations]                                ▲
                            │                                           │
                   (Async Reject/Error) ────────────────────────────────┘
```

- Express 5 natively forwards rejected promises and asynchronous execution failures automatically to the global error handler.
- `errorHandler.js` catches all execution bugs globally, overrides default HTML stack traces, parses Zod structural validation errors, handles MongoDB duplicate key indexes (11000), and formats everything into user-friendly JSON.
