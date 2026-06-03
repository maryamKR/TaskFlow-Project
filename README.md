# TaskFlow

A real-time collaborative Kanban project management application built on the MERN stack.

---

## Features

- **Kanban Boards** — Drag-and-drop task management across customisable columns
- **Real-time Collaboration** — Live updates via Socket.IO; see teammates' changes instantly
- **Team Management** — Invite collaborators by email; pending invitations auto-resolve on signup
- **Task Tracking** — Priority levels, labels, due dates, assignees, and activity logs
- **AI Assist** — Gemini-powered priority suggestions and automatic task labelling
- **Notifications** — In-app real-time notifications for assignments, comments, and board events
- **Overdue Alerts** — Automated daily email alerts for overdue tasks via a cron job
- **Analytics Dashboard** — Charts and stats for task completion, priorities, and team productivity
- **Dark / Light Mode** — System-aware theme with manual toggle

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router, Axios, Socket.IO Client, @dnd-kit, Recharts, TailwindCSS |
| Backend | Node.js, Express 5, Socket.IO, node-cron |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | JWT Bearer Tokens, bcryptjs |
| Validation | Zod schemas |
| Email | Nodemailer (SMTP / Gmail) |
| AI | Google Gemini API (`gemini-2.5-flash`) |
| Security | Helmet, CORS, express-rate-limit |
| Testing | Jest, Supertest (unit + integration) |

---

## Getting Started

### Prerequisites

- Node.js v18+
- A [MongoDB Atlas](https://mongodb.com/atlas) cluster (free tier works)
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords)
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone the repository

```bash
git clone https://github.com/maryamKR/TaskFlow-Project.git
cd TaskFlow-Project
```

### 2. Configure the backend environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/taskflow
JWT_SECRET=your_secure_random_secret

GEMINI_API_KEY=your_gemini_api_key

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_app_email@gmail.com
EMAIL_PASS=your16charapppassword

FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

> **Note:** `EMAIL_PASS` is a Gmail App Password, not your normal Gmail password. Remove all spaces from the 16-character code (e.g. `xxxxxxxxxxxxxxxx`).

### 3. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend (from root)
cd .. && npm install
```

### 4. Run in development

```bash
# Terminal 1: Start the backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2: Start the frontend (http://localhost:3000)
npm start
```

---

## Running Tests

```bash
cd backend
npm test
```

The test suite includes **255 unit and integration tests** covering all controllers, middleware, validators, utilities, and end-to-end HTTP flows. All tests run sequentially (`--runInBand`) to respect MongoDB Atlas connection limits.

---

## Project Structure

```
TaskFlow-Project/
├── backend/                  # Express.js API server
│   ├── controllers/          # Route handlers
│   ├── middleware/           # Auth, validation, error handling, rate limiting
│   ├── models/               # Mongoose schemas
│   ├── routes/               # API route definitions
│   ├── utils/                # Email, notifications, cron, task helpers
│   ├── docs/                 # Full backend documentation
│   │   ├── API.md            # Complete REST API reference
│   │   ├── architecture.md   # System design & data flow
│   │   ├── documentation.md  # Controller & utility deep-dive
│   │   ├── schema.md         # ER diagram & database indexes
│   │   ├── userflow.md       # Backend-focused user flow
│   │   ├── email-service.md  # Email & cron documentation
│   │   └── pending-invitations-flow.md
│   ├── tests/                # Jest unit + Supertest integration tests
│   ├── server.js             # Application bootstrap
│   └── socket.js             # Socket.IO room management
├── src/                      # React frontend
│   ├── components/           # Reusable UI components
│   ├── context/              # ThemeContext
│   ├── pages/                # Route-level page components
│   ├── services/             # Axios API service functions
│   └── socket.js             # Socket.IO client setup
└── userflow.md               # Full end-to-end user flow documentation
```

---

## API Reference

See [`backend/docs/API.md`](./backend/docs/API.md) for the complete endpoint reference, including request/response schemas, rate limits, and error codes.

**Base URL:** `http://localhost:5000/api`

| Section | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password/:token` |
| Boards | `GET/POST /boards`, `GET/DELETE /boards/:id`, `PUT /boards/:id/reorder` |
| Members | `GET /boards/:id/members`, `POST /boards/:id/invite`, `DELETE /boards/:id/members/:memberId` |
| Columns | `GET/POST /columns`, `PUT/DELETE /columns/:id` |
| Tasks | `GET/POST /tasks`, `GET/PUT/DELETE /tasks/:id`, `PATCH /tasks/move`, `PATCH /tasks/column/:id/reorder` |
| Comments | `GET/POST /tasks/:id/comments`, `DELETE /comments/:id` |
| Notifications | `GET /notifications`, `PATCH /notifications/read-all`, `DELETE /notifications/read` |
| AI | `POST /ai/suggest-priority`, `POST /ai/auto-label` |

---

## Documentation Index

| Document | Contents |
|---|---|
| [`userflow.md`](./userflow.md) | End-to-end user flows with API, socket events, and security summary |
| [`backend/docs/API.md`](./backend/docs/API.md) | Full REST API reference |
| [`backend/docs/architecture.md`](./backend/docs/architecture.md) | System design, security layers, real-time architecture |
| [`backend/docs/documentation.md`](./backend/docs/documentation.md) | Detailed controller, middleware, and utility reference |
| [`backend/docs/schema.md`](./backend/docs/schema.md) | ER diagram, collection indexes, notification types |
| [`backend/docs/email-service.md`](./backend/docs/email-service.md) | Email setup, SMTP config, cron job |
| [`backend/docs/pending-invitations-flow.md`](./backend/docs/pending-invitations-flow.md) | Board invitation workflow for registered and unregistered users |

---

## Security

- All endpoints protected by JWT Bearer token authentication
- Rate limiting on `/login` (10/15min), `/register` (5/hr), `/forgot-password` (3/hr)
- Input validated via Zod schemas before controllers execute
- HTTP headers hardened with Helmet
- CORS restricted to configured allowed origins
- Passwords hashed with bcryptjs (10 salt rounds)
- User enumeration protection on password reset endpoint

---

