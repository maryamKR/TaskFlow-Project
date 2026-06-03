# 📂 Exhaustive Backend Technical Review (File-by-File)

This guide provides a specific question and response for **every single file** and **major concept** in your backend.

---

## 📖 Deep Dive into Backend Concepts

### 1. Why MongoDB? (Database Choice)
**Q: Why did you choose MongoDB instead of a Relational Database like PostgreSQL or MySQL?**
*   **Response:** I chose **MongoDB** for three main reasons:
    1.  **Schema Flexibility**: In a project management tool, task structures can evolve (adding labels, subtasks, etc.). MongoDB's document model allows for this flexibility without complex migrations.
    2.  **JSON Alignment**: MongoDB stores data in BSON (Binary JSON), which perfectly matches the JSON data used in Node.js and the React frontend. This "JavaScript-to-Database" consistency speeds up development.
    3.  **Hierarchical Data**: The Board -> Column -> Task relationship is naturally hierarchical. MongoDB allows us to nest data or use ObjectIDs efficiently, which maps better to our UI than flat relational tables.

### 2. Reasoning Behind Core Packages
**Q: Can you explain why you chose specific libraries in your `package.json`?**
*   **`express`**: The industry standard for Node.js web frameworks. It is lightweight and has a massive ecosystem of middleware.
*   **`mongoose`**: Provides a structure (Schema) to our NoSQL data and simplifies complex operations like "Population" (joining documents).
*   **`socket.io`**: Chosen over plain WebSockets because it provides built-in support for "Rooms" and automatic reconnection, which are critical for collaboration.
*   **`jsonwebtoken (JWT)`**: Enables stateless authentication, making the backend more scalable since it doesn't need to store session data in memory.
*   **`zod`**: Unlike older validation libraries, Zod provides "TypeScript-first" validation, ensuring that our data is safe and correctly typed before it hits the database.
*   **`bcryptjs`**: A highly secure, standard library for hashing passwords using a computationally expensive algorithm to prevent brute-force attacks.
*   **`google/generative-ai`**: Used to integrate the Gemini 1.5 Flash model, chosen for its high-speed performance in generating task metadata.
*   **`express-async-handler`**: A utility to clean up our code by removing the need for `try/catch` in every single controller.
*   **`nodemailer`**: Highly customizable SMTP email client allowing direct delivery of transactional emails like password resets and invitations.
*   **`node-cron`**: Pure JavaScript task scheduler used to run scheduled background audits (e.g. searching for overdue tasks).

### 3. Node.js & Express.js (The Foundation)
The backend is built on **Node.js**, a JavaScript runtime that uses an **Event-Driven, Non-blocking I/O model**. **Express.js** is the framework used to handle the complexity of routing and middleware. This combination allows the server to handle thousands of concurrent connections efficiently.

### 4. The Middleware Pattern
Express operates on a "chain" of functions. A request passes through various middlewares (like `cors`, `express.json`, `protect`, and `validate`) before reaching the controller. This modularity allows us to reuse logic (like authentication) across many different routes.

### 5. RESTful API Architecture
The API follows **REST (Representational State Transfer)** principles. Resources (Boards, Tasks, Users) are accessed via standard HTTP verbs:
*   `GET`: Fetch data.
*   `POST`: Create new resources.
*   `PUT/PATCH`: Update existing resources.
*   `DELETE`: Remove resources.

### 6. Database Modeling (Mongoose & MongoDB)
I use **MongoDB**, a NoSQL document database, which stores data in JSON-like structures. **Mongoose** acts as the ODM (Object Data Modeling) layer, providing a strict **Schema** for our data and powerful features like **Validation** and **Middlewares** (hooks that run before saving a document).

### 7. Relational Logic in NoSQL (Population)
Even though MongoDB is non-relational, TaskFlow has relationships (e.g., a Task belongs to a Column). I use **ObjectIDs** and Mongoose's `.populate()` method to "join" documents, allowing us to fetch complex trees of data (Board -> Column -> Task) in a single logical flow.

### 8. Stateless Authentication (JWT)
Instead of using server-side sessions (which consume memory), I use **JSON Web Tokens (JWT)**. The server is "stateless"—it doesn't remember who is logged in. Instead, the client sends a signed token with every request, and the server verifies its signature to identify the user.

### 9. Real-Time Architecture (Socket.io)
For collaborative features, I used **WebSockets** via **Socket.io**. Unlike HTTP (where the client must ask for data), WebSockets allow the server to "push" updates to the client. I use **Rooms** to isolate updates so that a task move on "Board A" is only sent to users currently viewing "Board A."

### 10. Data Integrity (Zod Validation)
Validation happens at the "Gate." I use **Zod** to define schemas for incoming request bodies. This ensures that the data is typed correctly (e.g., email is a valid format, title is a string) *before* the controller logic starts, preventing bugs and crashes.

### 11. Centralized Error Handling Pipeline
The backend features a unified error handler. By using a single middleware at the end of the stack, I ensure that every error—whether it's a 404, a database crash, or a validation failure—is formatted into a consistent JSON response for the frontend.

### 12. AI Orchestration (Google Gemini)
The `aiController` integrates the **Google Generative AI SDK**. It uses **Prompt Engineering** to instruct the `gemini-2.5-flash` model to act as a project manager, analyzing task descriptions to automate metadata generation (priority and labels).

### 13. Environment Configuration (.env)
Security is maintained by isolating secrets (DB URI, API Keys, JWT Secrets) from the code using **Environment Variables**. This follows the **Twelve-Factor App** methodology, ensuring the code is safe to share while sensitive keys remain private.

---

## 🏗️ Core & Config

### `server.js` & `config/db.js`
1.  **Q: How does your server handle different types of traffic (HTTP vs WebSockets)?**
    *   **Response:** I use the `http` module to create a server that wraps the `express` app. This allows both the Express REST API and `socket.io` to run on the same port simultaneously.
2.  **Q: How do you handle environment variables safely?**
    *   **Response:** I use the `dotenv` package to load variables from a `.env` file into `process.env`. This keeps sensitive keys like `MONGO_URI` and `JWT_SECRET` out of the source code.
3.  **Q: Why use `express.json()` middleware?**
    *   **Response:** It is a built-in middleware that parses incoming requests with JSON payloads. Without it, `req.body` would be undefined when the frontend sends data.
4.  **Q: What is `cors` and why is it configured with specific origins?**
    *   **Response:** CORS (Cross-Origin Resource Sharing) is a security feature. I restricted it to specific origins (like `localhost:5173`) to ensure only my authorized frontend can communicate with this API.
5.  **Q: What happens if the database connection fails on startup?**
    *   **Response:** The `connectDB` function in `config/db.js` uses a `try-catch` block. If the connection fails, it logs the error and exits the process (`process.exit(1)`), preventing the server from running in a broken state.

---

## 👤 Authentication & Users

### `models/User.js` & `authController.js`
1.  **Q: Why don't you store the password in plain text?**
    *   **Response:** For security. I use `bcryptjs` to hash passwords. Even if the database is compromised, the actual passwords remain unreadable.
2.  **Q: What is the difference between Authentication and Authorization in your app?**
    *   **Response:** **Authentication** (handled by Login/Register) identifies *who* the user is. **Authorization** (handled by `protect` and `boardAuth`) decides *what* they are allowed to do (e.g., a coworker can see a board but not delete it).
3.  **Q: Why use 10 salt rounds for Bcrypt?**
    *   **Response:** 10 is the industry standard balance between security and performance. It makes the hashing slow enough to prevent brute-force attacks but fast enough for a good user experience.
4.  **Q: Why use `.select('-password')` when fetching a user?**
    *   **Response:** This is a security "best practice." It ensures that the password hash is never sent out of the database and into the application layer, even by accident.
5.  **Q: How does the `protect` middleware verify a user's identity?**
    *   **Response:** It extracts the JWT from the `Authorization` header, verifies its signature using the `JWT_SECRET`, and if valid, it fetches the user from the DB and attaches them to `req.user`.
6.  **Q: How does registration auto-join invited users to boards?**
    *   **Response:** When a new user registers, the system queries the `Board` collection for any document containing their email inside the `pendingInvites` list. If matches are found, it appends the new user's ID to `board.coworkers`, removes the email from `pendingInvites`, saves the board, and creates database notifications for both the new coworker and the board owner.

---

## 📋 Boards & Columns

### `models/Board.js` & `controllers/boardController.js`
1.  **Q: How is the board owner determined?**
    *   **Response:** Every Board document has a `user` field that stores the ObjectID of the person who created it. This user has "Admin" rights over the board.
2.  **Q: What is "Cascade Deletion," and do you use it?**
    *   **Response:** Yes. When a board is deleted, I ensure all associated columns and tasks are also removed from the database to prevent "orphan data" from filling up the database.
3.  **Q: Why use `ObjectIDs` instead of simple strings for relations?**
    *   **Response:** ObjectIDs allow Mongoose to perform "Population." This means I can treat a reference like a real object and easily fetch related data (like a user's name) without writing complex JOIN queries.
4.  **Q: How do you handle performance when a board has many tasks?**
    *   **Response:** I use "Deep Population" carefully. Instead of fetching everything at once, I only populate the necessary fields (like `username`) to keep the JSON payload light.
5.  **Q: How do you prevent unauthorized users from inviting members?**
    *   **Response:** In the `inviteMember` route, I check if `req.user._id` matches the board's `user` (owner). If they don't match, I return a `403 Forbidden` error.
6.  **Q: How does the system handle invitations for users who do not have an account yet?**
    *   **Response:** If the invited email address does not exist in the database, the system adds it to the Board's `pendingInvites` array and dispatches a branded sign-up email via Nodemailer. The invite stays in the board's pending queue until the user registers with that email.

---

## 📝 Tasks, Comments & Notifications

### `models/Task.js` & `controllers/taskController.js`
1.  **Q: How do you handle task due dates?**
    *   **Response:** I store them as `Date` objects in MongoDB. This allows the frontend to format them based on the user's local timezone and allows for easy date-range filtering.
2.  **Q: What is the benefit of "Pointer Synchronization" when moving tasks?**
    *   **Response:** It ensures data integrity. I update the task's parent reference AND the column's task array in the same operation. This prevents "ghost tasks" that exist in a column but don't know where they belong.
3.  **Q: Why use a separate model for Comments instead of an array inside the Task?**
    *   **Response:** Scalability. If a task has 500 comments, an array would make the Task document too large and slow to load. A separate model allows us to fetch comments only when needed.
4.  **Q: How are notifications cleared?**
    *   **Response:** I have a `read-all` endpoint that updates all notifications for the current user to `isRead: true`, and a `delete-read` endpoint to purge them from the database.
5.  **Q: How do you ensure notifications are only sent to the relevant users?**
    *   **Response:** When a task is assigned, I check if the `assignedTo` ID is different from the `req.user._id` (the person who made the change) to avoid sending a notification to yourself.
6.  **Q: Who receives notifications when a coworker joins a board?**
    *   **Response:** Both the **invited member** (welcoming them to the board) and the **board owner** (notifying them that their coworker has successfully joined) receive a `BOARD_INVITATION` database notification immediately upon joining.

---

## 📧 Automated Email & Background Jobs

### `utils/emailService.js` & `utils/scheduledJobs.js`
1.  **Q: How do board invitation emails handle delivery and routing?**
    *   **Response:** Nodemailer is configured to authenticate with `EMAIL_USER` (the app's sender address). When sending an invite, the `from` field is set to the app's email, but the `replyTo` field is set to the **board owner's personal email**. If the invitee hits "Reply", the email is routed directly to the board owner, bypassing the platform inbox.
2.  **Q: How does the system detect and notify users about overdue tasks?**
    *   **Response:** A background job (`scheduledJobs.js`) runs every day at midnight (`0 0 * * *`) using `node-cron`. 
        *   It queries the database for all incomplete tasks whose `dueDate` is less than the current time and where `overdueEmailSent` is not true.
        *   It identifies the recipient (the assignee, falling back to the task creator if unassigned).
        *   It sends an email using the `overdueTaskTemplate` and marks the task as `overdueEmailSent: true` to prevent duplicate emails.
3.  **Q: Why is email sending designed to be non-blocking?**
    *   **Response:** Email sending involves external network requests to SMTP servers, which can be slow or fail. To prevent email server issues from slowing down or crashing the API response, all mail dispatch calls are handled asynchronously without blocking the client's HTTP response.

---

## 🤖 AI & Validation

### `controllers/aiController.js` & `middleware/validate.js`
1.  **Q: Why choose the `gemini-2.5-flash` model specifically?**
    *   **Response:** It is optimized for speed and low latency. For features like "Auto-Priority," we need a near-instant response so the user flow isn't interrupted.
2.  **Q: How do you sanitize AI output before using it?**
    *   **Response:** I use `.trim().toLowerCase()` and a regex to strip punctuation. I also check the result against an array of `validPriorities`. If the AI returns something weird, I default to "medium."
3.  **Q: What happens if a Zod validation fails?**
    *   **Response:** Zod throws a `ZodError`. My `validate` middleware catches it and passes it to the `errorHandler`, which returns a clean 400 error with a list of specifically what was wrong.
4.  **Q: Why is error handling centralized?**
    *   **Response:** It ensures consistency. No matter where a bug occurs, the frontend always receives the same JSON format: `{ success: false, error: "..." }`.
5.  **Q: How do you handle MongoDB unique constraint errors (like duplicate emails)?**
    *   **Response:** In `errorHandler.js`, I check for error code `11000`. I then parse which field caused the conflict and return a clear message like "Email already exists" instead of a cryptic database error.

---

## 🛤️ Routes & Infrastructure

### `routes/*.js` & `socket.js`
1.  **Q: Why do you use `express.Router()`?**
    *   **Response:** Modularity. It allows me to group related routes (e.g., all `/api/tasks`) into their own files, making the main `server.js` much easier to read.
2.  **Q: What is the purpose of `express-async-handler`?**
    *   **Response:** It wraps asynchronous routes to catch errors automatically. Without it, a single unhandled `await` failure could crash the entire Node.js server.
3.  **Q: Why use `PATCH` for moving tasks instead of `PUT`?**
    *   **Response:** `PUT` is for replacing a whole resource, while `PATCH` is for partial updates. Since moving a task only changes its `columnId` and position, `PATCH` is semantically more correct.
4.  **Q: How does `socket.js` know which board to update?**
    *   **Response:** The frontend sends a `join_board` event with the `boardId`. The server then uses `socket.join(boardId)` to group that user with others viewing the same board.
5.  **Q: How do you handle 404 (Not Found) routes?**
    *   **Response:** Since the `errorHandler` is the last middleware, any request that doesn't match a route will fall through. (Note: You can add a catch-all 404 middleware before the error handler for even better UX).

---

## 🧪 Documentation & Testing

### `API.md` & `tests/*.js`
1.  **Q: What is the difference between unit and integration tests in your project?**
    *   **Response:** **Unit tests** (like `authValidator.test.js`) test a single function in isolation. **Integration tests** (using Supertest) test the entire flow from Route -> Middleware -> Controller -> Database.
2.  **Q: Why use `supertest` for testing?**
    *   **Response:** It allows us to simulate real HTTP requests to our Express app without needing to actually start the server on a network port, making tests fast and reliable.
3.  **Q: How do you test protected routes that require a token?**
    *   **Response:** In my tests, I first call the login endpoint to get a token, then I pass that token in the `.set('Authorization', 'Bearer ...')` header of the subsequent test requests.
4.  **Q: Why use the `--runInBand` flag in your test script?**
    *   **Response:** It forces Jest to run tests sequentially rather than in parallel. Since our tests share the same MongoDB instance, running them in parallel could cause "race conditions" where one test deletes data that another test is trying to read.
5.  **Q: What is the most important part of your `API.md`?**
    *   **Response:** The **Request Body** and **Success Response** examples. They act as a "Source of Truth" for the frontend developers so they know exactly what data to send and what to expect back.

---

## 🚀 Advanced Project Features (Jury Highlights)

1.  **Q: What happens automatically when a new board is created?**
    *   **Response:** The backend automatically initializes four default columns: **"To Do"**, **"In Progress"**, **"Review"**, and **"Done"**. This provides an immediate, ready-to-use workflow for the user.
2.  **Q: How do you handle security when updating column titles?**
    *   **Response:** In the `updateColumn` controller, I explicitly **destructure only the `title`** from the request body. This prevents a malicious user from injecting other fields (like changing the board ID) into the update query.
3.  **Q: How does your search feature work?**
    *   **Response:** The Task model uses a **MongoDB Text Index** on the `title` and `description` fields. This allows the `getTasks` controller to perform high-performance text searches across all tasks on a board.
4.  **Q: What are the different types of notifications in the system?**
    *   **Response:** There are four main triggers: `BOARD_INVITATION` (when invited to a board), `TASK_ASSIGNED` (when a task is given to you), `TASK_UPDATED` (when details of your task change), and `COMMENT` (when someone discusses a task assigned to you).
5.  **Q: How do you ensure a task reorder request is valid?**
    *   **Response:** Before saving the new order, the backend verifies that **every single task ID** in the request actually belongs to that specific column. This prevents users from "stealing" tasks from other columns via the reorder API.
