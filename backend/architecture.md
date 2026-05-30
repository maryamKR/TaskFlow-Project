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
│   └── boardAuth.js    # Permission & access logic
├── .env                # Local environment secrets (DB strings, JWT secret)
├── API.md              # Detailed API documentation & examples
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

### B. Collaboration & Member Management
TaskFlow supports multi-user collaboration on boards:
- **Ownership:** Every board has a primary `user` (owner) who has full administrative rights (e.g., deleting the board, inviting members, removing coworkers). Coworkers cannot remove other members.
- **Coworkers:** Owners can invite other registered users to their boards via email. Invited users are added to the `coworkers` array in the Board document.
- **Access Control:** The `boardAuth.js` utility provides a `hasBoardAccess` check that allows both the owner and coworkers to view and modify columns/tasks, while restricting destructive actions like board deletion to the owner only. The `getBoardMembers` route requires `hasBoardAccess` authorization to prevent unauthorized access to member lists. The access utility safely handles both raw ObjectIDs and fully populated User document objects.

### C. Data Layer & Relational Schema Tree
TaskFlow enforces a hierarchical MongoDB relational document pattern with bidirectional references to ensure data integrity:
- **User:** Root identity. It utilizes standard Mongoose timestamps (`createdAt`, `updatedAt`) for automated audit tracking.
- **Board:** Parent container referencing an owning User, an array of Column ObjectIDs, and an array of coworker User ObjectIDs.
- **Column:** Middle structural tier referencing its parent Board and containing an ordered array of Task ObjectIDs.
- **Task:** The work node containing metadata (including a categorizing `label` string). It maintains a **back-reference** to its parent Column (indexed for performance) to ensure every task has a single, verifiable source of truth for its location.

### D. Automated Data Linkage & Deep Population
The system uses explicit controller logic to maintain atomic operations:
- **Pointer Synchronization:** During task movement, the system updates both the parent Column arrays and the task's internal column reference, preventing data desynchronization.
- **Reordering Integrity:** When columns or tasks are reordered, the request is validated to ensure that all incoming IDs belong to the parent Board/Column, preventing foreign ObjectID injection.
- **Nested Sub-Document Population:** To avoid making multiple round-trips, the system relies on **Deep Population**. Calling a board loads the root element and recursively populates the column and task hierarchies into a single nested tree for the frontend.

### E. Real-time Event Layer (Socket.io)
TaskFlow provides a collaborative "live" experience using a dedicated Socket.io implementation (`socket.js`):
- **Room-Based Isolation:** Users are joined to rooms named after the `boardId`. This ensures that real-time updates (like moving a task) are only broadcast to users currently viewing the same board.
- **Event-Driven UI:** When a state-altering or layout-altering action occurs (e.g., `columns_reordered`, `task_created`, `task_updated`, `task_deleted`, `task_moved`, `tasks_reordered`, `comment_added`, `comment_deleted`), the server emits an event to the specific room. The frontend listens for these events to update its state instantly without a page refresh.

### F. Notification & Commenting Systems
Beyond core task management, TaskFlow provides auxiliary services to drive engagement:
- **Asynchronous Notifications:** Actions like assigning a task, updating task details, or inviting a member trigger the creation of a `Notification` document. These are served to the specific target user via the `notificationController.js`.
- **Task Discussions:** Users can add comments to any task. These are stored as separate `Comment` documents and linked to the `Task` model, enabling persistent threaded conversations.

## 4. Error Handling Flow
To prevent server runtime crashes and keep error patterns predictable, the backend implements a centralized interception flow:

 ```text
[Incoming Request] ──> [Zod Validation] ──(Fails)───────────────────────┐
                            │                                           │
                         (Passes)                                       ▼
                            ▼                                  [errorHandler.js] ──> [Clean JSON Response]
                 [Controller Operations]                                ▲
                            │                                           │
                         (Rejects)                                      │
                            ▼                                           │
                 [express-async-handler] ───────────────────────────────┘
```

- Controllers are wrapped in `express-async-handler` to forward asynchronous execution failures automatically.
- `errorHandler.js` catches all execution bugs globally, overrides default HTML stack traces, parses Zod structural validation errors, handles MongoDB duplicate key indexes (11000), and formats everything into user-friendly JSON.
