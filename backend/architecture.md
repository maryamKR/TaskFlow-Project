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
├── controllers/        # Request handlers (processes inputs, sends responses)
│   └── authController.js
├── middleware/         # Request interceptors (security guards, error catches)
├── validators/         # Request payload validation blueprints
│   │   └── authValidator.js
│   ├── authMiddleware.js
│   └── errorHandler.js
├── models/             # Database schemas 
│   └── User.js
├── routes/             # API Endpoints mapping to controllers
│   └── authRoutes.js
├── .env                # Local environment secrets 
├── server.js           # Application entry point
└── package.json        # Dependencies

```

## 3. Core Architectural Layers

### A. Security & Authentication Layer
- **Payload Validation (Zod):** Request bodies are parsed and validated against Zod schemas at the routing layer before reaching the controllers, ensuring input strings match required data types and structural formats.
- **Password Hashing:** Passwords are never stored in plain text.The `User.js` model automatically salts and hashes strings using `bcryptjs` before committing them to the database.
- **Session Tracking:** Stateless authentication using JSON Web Tokens (JWT). Upon valid login/registration, the server issues a signed token valid for 30 days.
- **Route Guarding:** The `authMiddleware.js` file intercepts requests to protected routes.It extracts the `Bearer <token>` from the HTTP Authorization header, verifies it, and attaches the user payload to `req.user`.

### B. Robust Error Handling Flow
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