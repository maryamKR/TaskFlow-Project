require("./setup");
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Board = require("../../models/Board");
const Column = require("../../models/Column");
const Task = require("../../models/Task");
const Comment = require("../../models/Comment");
const jwt = require("jsonwebtoken");

describe("Task Integration Tests", () => {
  let userToken;
  let user;
  let board;
  let todoColumn;
  let progressColumn;
  let doneColumn;

  beforeEach(async () => {
    user = await User.create({
      username: "boardowner",
      email: "owner@test.com",
      password: "password123",
    });

    userToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    board = await Board.create({
      title: "Task Project",
      user: user._id,
    });

    todoColumn = await Column.create({ title: "To Do", board: board._id, position: 0 });
    progressColumn = await Column.create({ title: "In Progress", board: board._id, position: 1 });
    doneColumn = await Column.create({ title: "Done", board: board._id, position: 2 });

    board.columns = [todoColumn._id, progressColumn._id, doneColumn._id];
    await board.save();
  });

  // ─── Create Task ───
  describe("POST /api/tasks", () => {
    it("should create a task under a valid column and default priority to medium", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          title: "Implement Login Flow",
          columnId: todoColumn._id.toString(),
        })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("title", "Implement Login Flow");
      expect(response.body.data).toHaveProperty("priority", "medium");

      const taskId = response.body.data._id;

      // Verify task was saved in the column
      const col = await Column.findById(todoColumn._id);
      expect(col.tasks.map((id) => id.toString())).toContain(taskId);
    });

    it("should block direct task creation in Done column", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          title: "Instantly Done Task",
          columnId: doneColumn._id.toString(),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/cannot be created directly in the Done column/i);
    });
  });

  // ─── Update Task ───
  describe("PUT /api/tasks/:id", () => {
    it("should update task properties successfully", async () => {
      const task = await Task.create({
        title: "Old Title",
        column: todoColumn._id,
        createdBy: user._id,
      });

      const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          title: "New Title",
          priority: "high",
          description: "New description details",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe("New Title");
      expect(response.body.data.priority).toBe("high");
    });
  });

  // ─── Move Task ───
  describe("PATCH /api/tasks/move", () => {
    it("should move task from one column to another in Mongoose collections", async () => {
      const task = await Task.create({
        title: "Moving Task",
        column: todoColumn._id,
        createdBy: user._id,
      });

      todoColumn.tasks.push(task._id);
      await todoColumn.save();

      const response = await request(app)
        .patch("/api/tasks/move")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          taskId: task._id.toString(),
          sourceColumnId: todoColumn._id.toString(),
          destinationColumnId: progressColumn._id.toString(),
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify the task changed column pointer
      const updatedTask = await Task.findById(task._id);
      expect(updatedTask.column.toString()).toBe(progressColumn._id.toString());

      // Verify todoColumn removed task and progressColumn added it
      const updatedTodo = await Column.findById(todoColumn._id);
      const updatedProgress = await Column.findById(progressColumn._id);

      expect(updatedTodo.tasks).not.toContainEqual(task._id);
      expect(updatedProgress.tasks.map((id) => id.toString())).toContain(task._id.toString());
    });
  });

  // ─── Delete Task ───
  describe("DELETE /api/tasks/:id", () => {
    it("should delete task and cascade delete its comments", async () => {
      const task = await Task.create({
        title: "Temp Task",
        column: todoColumn._id,
        createdBy: user._id,
      });

      todoColumn.tasks.push(task._id);
      await todoColumn.save();

      // Create a comment on this task
      const comment = await Comment.create({
        content: "Nice work",
        author: user._id,
        task: task._id,
      });

      await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      // Verify task is deleted
      expect(await Task.findById(task._id)).toBeNull();

      // Verify comment is cascade deleted
      expect(await Comment.findById(comment._id)).toBeNull();

      // Verify task is pulled from the column's task list
      const updatedTodo = await Column.findById(todoColumn._id);
      expect(updatedTodo.tasks).not.toContainEqual(task._id);
    });
  });
});
