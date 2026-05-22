# TaskFlow API Documentation

This document provides a comprehensive guide to the TaskFlow Backend API endpoints, request payloads, and example responses.

## Base URL
`http://localhost:5000/api`

## Authentication
All routes except `/auth/register` and `/auth/login` require a Bearer Token in the Authorization header.
**Header:** `Authorization: Bearer <your_jwt_token>`

---

### 1. Auth Endpoints

#### Register User
*   **URL:** `/auth/register`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "username": "johndoe",
      "email": "john@example.com",
      "password": "password123"
    }
    ```
*   **Success Response (201):**
    ```json
    {
      "_id": "60d5ec...",
      "username": "johndoe",
      "email": "john@example.com",
      "token": "eyJhbG..."
    }
    ```

#### Login User
*   **URL:** `/auth/login`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "email": "john@example.com",
      "password": "password123"
    }
    ```
*   **Success Response (200):**
    ```json
    {
      "_id": "60d5ec...",
      "username": "johndoe",
      "email": "john@example.com",
      "token": "eyJhbG..."
    }
    ```

---

### 2. Board Endpoints

#### Create Board
*   **URL:** `/boards`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "title": "Project Alpha",
      "coworkers": ["60d5ed..."] 
    }
    ```
*   **Success Response (201):**
    ```json
    {
      "success": true,
      "data": {
        "_id": "60d5ee...",
        "title": "Project Alpha",
        "user": "60d5ec...",
        "columns": [
          { "_id": "60d5ef...", "title": "To Do", ... },
          { "_id": "60d5f0...", "title": "In Progress", ... }
        ]
      }
    }
    ```

#### Get All Boards
*   **URL:** `/boards`
*   **Method:** `GET`
*   **Success Response (200):**
    ```json
    {
      "success": true,
      "count": 1,
      "data": [...]
    }
    ```

#### Get Board By ID
*   **URL:** `/boards/:id`
*   **Method:** `GET`
*   **Success Response (200):**
    ```json
    {
      "success": true,
      "data": {
        "_id": "60d5ee...",
        "title": "Project Alpha",
        "columns": [...]
      }
    }
    ```

#### Delete Board
*   **URL:** `/boards/:id`
*   **Method:** `DELETE`
*   **Success Response (200):**
    ```json
    {
      "success": true,
      "message": "Board and all associated data removed"
    }
    ```

---

### 3. Member Endpoints (Collaborators)

#### Get Board Members
*   **URL:** `/boards/:boardId/members`
*   **Method:** `GET`
*   **Success Response (200):**
    ```json
    [
      { "_id": "60d5ed...", "username": "jane_doe", "email": "jane@example.com" }
    ]
    ```

#### Invite Member to Board
*   **URL:** `/boards/:boardId/invite`
*   **Method:** `POST`
*   **Body:**
    ```json
    { "email": "newuser@example.com" }
    ```
*   **Success Response (200):**
    ```json
    {
      "message": "User invited successfully",
      "coworkers": ["60d5ed...", "60d5f1..."]
    }
    ```

---

### 4. Column Endpoints

#### Create Column
*   **URL:** `/columns`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "title": "Backlog",
      "boardId": "60d5ee..."
    }
    ```
*   **Success Response (201):**
    ```json
    {
      "success": true,
      "data": { "_id": "60d5f2...", "title": "Backlog", "board": "60d5ee...", "position": 4 }
    }
    ```

#### Get Columns for Board
*   **URL:** `/columns/board/:boardId`
*   **Method:** `GET`
*   **Success Response (200):**
    ```json
    {
      "success": true,
      "data": [...]
    }
    ```

#### Update Column
*   **URL:** `/columns/:id`
*   **Method:** `PUT`
*   **Body:**
    ```json
    { "title": "Updated Title" }
    ```
*   **Success Response (200):**
    ```json
    { "success": true, "data": { ... } }
    ```

#### Delete Column
*   **URL:** `/columns/:id`
*   **Method:** `DELETE`
*   **Success Response (200):**
    ```json
    { "success": true, "message": "Column and associated tasks removed" }
    ```

---

### 5. Task Endpoints

#### Create Task
*   **URL:** `/tasks`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "title": "Fix Auth Bug",
      "columnId": "60d5ef...",
      "description": "Token is not being cleared on logout",
      "priority": "high",
      "dueDate": "2023-12-31T12:00:00Z",
      "assignedTo": "60d5ed..."
    }
    ```
*   **Success Response (201):**
    ```json
    { 
      "success": true, 
      "data": { 
        "_id": "60d5f3...", 
        "title": "Fix Auth Bug", 
        "column": "60d5ef...",
        "priority": "high",
        ... 
      } 
    }
    ```

#### Get Task By ID
*   **URL:** `/tasks/:id`
*   **Method:** `GET`
*   **Success Response (200):**
    ```json
    { "success": true, "data": { ... } }
    ```

#### Update Task
*   **URL:** `/tasks/:id`
*   **Method:** `PUT`
*   **Body:**
    ```json
    { 
      "title": "New Title",
      "priority": "medium",
      "assignedTo": null 
    }
    ```
*   **Success Response (200):**
    ```json
    { "success": true, "data": { ... } }
    ```

#### Move Task (Change Column)
*   **URL:** `/tasks/move`
*   **Method:** `PATCH`
*   **Body:**
    ```json
    {
      "taskId": "60d5f3...",
      "sourceColumnId": "60d5ef...",
      "destinationColumnId": "60d5f0..."
    }
    ```
*   **Success Response (200):**
    ```json
    { "success": true, "message": "Task moved successfully" }
    ```

#### Delete Task
*   **URL:** `/tasks/:id`
*   **Method:** `DELETE`
*   **Success Response (200):**
    ```json
    { "success": true, "message": "Task deleted successfully" }
    ```

---

## 6. Common Error Responses

### Standard Error Format
TaskFlow guarantees a consistent JSON structure for all error responses. Frontend developers can always expect the following object:

```json
{
  "success": false,
  "error": "A descriptive error message"
}
```

---

### Status Code Reference

| Status Code | Type | Description |
| :--- | :--- | :--- |
| **400** | Bad Request | Input validation failed, missing required fields, or business logic violations. |
| **401** | Unauthorized | Authentication failed due to a missing, invalid, or expired token. |
| **403** | Forbidden | The user is authenticated but lacks the required permissions for this specific action. |
| **404** | Not Found | The requested resource (User, Board, Column, or Task) could not be located. |
| **500** | Server Error | An unexpected error occurred on the server or database. |

---

### Example Scenarios

#### Validation Failure (400)
Returned when Zod schema validation or Mongoose constraints are triggered.
```json
{
  "success": false,
  "error": "Username must be at least 3 characters long"
}
```

#### Token Expiration (401)
Returned when the JWT token has expired.
```json
{
  "success": false,
  "error": "Session expired, please log in again."
}
```

#### Permission Denied (403)
Returned when a non-owner attempts a restricted action.
```json
{
  "success": false,
  "error": "Only the board owner can invite members"
}
```
