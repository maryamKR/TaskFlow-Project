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

### Auth Controller (\`authController.js\`)
Handles user identity and session management.

*   \`registerUser(req, res)\`:
    *   Checks if the email is already in use.
    *   Hashes the password (via Mongoose pre-save hook).
    *   Creates a new User and returns a JWT token.
*   \`loginUser(req, res)\`:
    *   Validates credentials against the database.
    *   Returns a JWT token upon successful authentication.

### Board Controller (\`boardController.js\`)
Manages the lifecycle of project boards.

*   \`createBoard(req, res)\`: Creates a board and automatically initializes four default columns: "To Do", "In Progress", "Review", and "Done".
*   \`getBoards(req, res)\`: Retrieves all boards where the user is either the owner or a coworker, sorted by creation date.
*   \`getBoardById(req, res)\`: Fetches a specific board with fully populated columns and tasks.
*   \`deleteBoard(req, res)\`: Permanently removes a board along with all its associated columns and tasks.
*   \`reorderColumns(req, res)\`: Updates the column order array on the Board model and emits a \`columns_reordered\` socket event.

### Board Member Controller (\`boardMemberController.js\`)
Handles collaboration and permissions.

*   \`getBoardMembers(req, res)\`: Retrieves a list of all users (owner + coworkers) associated with a board.
*   \`inviteMember(req, res)\`: Adds a user to the \`coworkers\` array by their email. Restricts invitations to board owners only.
*   \`removeMember(req, res)\`: Removes a user from the \`coworkers\` array. Prevents removing the board owner.

### Column Controller (\`columnController.js\`)
Manages task groupings within boards.

*   \`createColumn(req, res)\`: Adds a new column to a board and updates the board's column reference list.
*   \`getColumnsByBoard(req, res)\`: Retrieves all columns for a specific board.
*   \`updateColumn(req, res)\`: Updates the title of an existing column.
*   \`deleteColumn(req, res)\`: Removes a column and deletes all tasks contained within it.

### Task Controller (\`taskController.js\`)
The core logic for task management and real-time updates.

*   \`createTask(req, res)\`: Creates a task, assigns it to a column, and triggers a \`TASK_ASSIGNED\` notification if an assignee is specified.
*   \`getTask(req, res)\`: Retrieves detailed information for a single task, including comments.
*   \`updateTask(req, res)\`: Modifies task details (title, priority, etc.). Triggers \`TASK_UPDATED\` or \`TASK_ASSIGNED\` notifications as needed.
*   \`deleteTask(req, res)\`: Removes a task and cleans up the reference in the parent column.
*   \`moveTask(req, res)\`: Moves a task between columns. Synchronizes pointers in both columns and the task itself. Emits \`task_moved\` socket event.
*   \`reorderTask(req, res)\`: Reorders tasks within a single column. Emits \`tasks_reordered\` socket event.
*   \`getTasks(req, res)\`: A versatile query method supporting search, priority filters, assignee filters, and date range filtering.

### Comment Controller (\`commentController.js\`)
Handles task-level discussions.

*   \`addComment(req, res)\`: Creates a comment and adds its reference to the Task model.
*   \`getComments(req, res)\`: Retrieves all comments for a specific task.
*   \`deleteComment(req, res)\`: Removes a comment and cleans up the reference in the Task model.

---

## 3. Middleware

### Auth Middleware (\`authMiddleware.js\`)
*   \`protect\`: A gatekeeper function that verifies the JWT in the \`Authorization\` header. It attaches the authenticated user object to \`req.user\`.

### Error Handler (\`errorHandler.js\`)
*   \`errorHandler\`: A centralized catch-all for errors. It provides specific formatting for:
    *   **ZodError:** Validation failures.
    *   **CastError:** Invalid MongoDB IDs.
    *   **MongoServerError (11000):** Duplicate key errors (e.g., duplicate emails).
    *   **JsonWebTokenError:** Authentication failures.

### Validation Middleware (\`validate.js\`)
*   \`validate(schema)\`: A factory function that returns a middleware using Zod to validate \`req.body\` or \`req.query\` before the controller logic executes.

---

## 4. Models (Schemas)

*   **User:** Stores credentials and profile info. Uses \`bcrypt\` for password hashing.
*   **Board:** Tracks ownership (\`user\`), collaborators (\`coworkers\`), and the ordered list of \`columns\`.
*   **Column:** Represents a vertical list. Holds a reference to the \`board\` and an ordered array of \`tasks\`.
*   **Task:** The central unit of work. Includes fields for \`priority\`, \`dueDate\`, \`assignedTo\`, and \`comments\`. Supports text indexing for search.
*   **Comment:** Simple text entries linked to a \`task\` and an \`author\`.
*   **Notification:** Persistent alerts for users. Stores \`message\`, \`type\`, and \`relatedId\` (e.g., a Task ID).

---

## 5. Utilities

### Board Auth (\`boardAuth.js\`)
*   \`hasBoardAccess(board, userId)\`: Determines if a user has permission to view or modify a board. It handles both owner and coworker checks, accounting for unpopulated Mongoose ID strings.

### Socket Utility (\`socket.js\`)
*   \`initSocket(server)\`: Initializes the Socket.io instance.
*   \`getIO()\`: Provides access to the IO instance from anywhere in the application to emit events.
