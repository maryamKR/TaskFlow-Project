# TaskFlow Backend Architecture Documentation

This document serves as the official structural guide for the TaskFlow backend. 
It details the system architecture, file organization, data flow, and security layers.

---

## 1. High-Level System Architecture

TaskFlow uses a decoupled client-server architecture built on the MERN stack (MongoDB, Express, React, Node.js).

## 2. Directory Structure

The backend follows a strict **Controller-Service-Route** architectural pattern to ensure separation of concerns:

```text
backend/
├── config/             # Database connection setups (db.js)
├── controllers/        # Request handlers (processes inputs, executes DB actions)
│   ├── authController.js
│   ├── boardController.js
│   ├── columnController.js
│   └── taskController.js
├── middleware/         # Request interceptors & security guards
│   ├── validators/     # Request payload Zod validation blueprints
│   │   ├── authValidator.js
│   │   ├── columnValidator.js
│   │   └── taskValidator.js
│   ├── authMiddleware.js
│   └── errorHandler.js
├── models/             # Database schemas & Mongoose ODM models
│   ├── User.js
│   ├── Board.js
│   ├── Column.js
│   └── Task.js
├── routes/             # API Endpoints mapping HTTP verbs to controllers
│   ├── authRoutes.js
│   ├── boardRoutes.js
│   ├── columnRoutes.js
│   └── taskRoutes.js
├── .env                # Local environment secrets (DB strings, JWT secret)
├── server.js           # Application entry point & middleware registration
└── package.json        # Node.js project dependencies

```

## 3. Core Architectural Layers

### A. Security & Authentication Layer
- **Payload Validation (Zod):** Request bodies are parsed and validated against Zod schemas at the routing layer before reaching the controllers, ensuring input strings match required data types and structural formats.
- **Password Hashing:** Passwords are never stored in plain text.The `User.js` model automatically salts and hashes strings using `bcryptjs` before committing them to the database.
- **Session Tracking:** Stateless authentication using JSON Web Tokens (JWT). Upon valid login/registration, the server issues a signed token valid for 30 days.
- **Route Guarding:** The `authMiddleware.js` file intercepts requests to protected routes.It extracts the `Bearer <token>` from the HTTP Authorization header, verifies it, and attaches the user payload to `req.user`.

### B. Data Layer & Relational Schema Tree
 TaskFlow enforces a hierarchical MongoDB relational document pattern to handle Kanban states. Instead of giant, bloated monolithic documents, data is split cleanly across multiple collections bound by reference ObjectIDs:
- User: Root identity.
- Board: Parent container referencing a owning User and an array of Column ObjectIDs.
- Column: Middle structural tier referencing its parent Board and containing an ordered array of Task ObjectIDs.
- Task: The standalone work node containing metadata (priority, dueDate, description) and referencing its current parent Column.

### C. Automated Data Linkage & Deep Population

To maintain atomic operations while optimizing data retrieval for the frontend, the controller layer utilizes two database patterns:
   Dual-Write Linkage: When creating child elements (like adding a Task to a Column), the system automatically creates the new document and performs a Mongoose $push to insert the new child _id into the parent document's reference array in a single workflow.
   Nested Sub-Document Population: To avoid making multiple resource-heavy round-trips to the database, the Board retrieval service relies on Deep Population. Calling a board loads the root element, maps across the columns collection, and simultaneously dives into the task collection to return a perfectly nested hierarchy tree down to the user frontend.

## 4. Error Handling Flow
To prevent server runtime crashes and keep error patterns predictable, the backend implements a centralized interception flow

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
-`errorHandler.js` catches all execution bugs globally, overrides default HTML stack traces,parses Zod structural validation errors, parses native MongoDB codes (like duplicate key index `11000`), and formats them into user friendly error messages