require("./setup");
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Board = require("../../models/Board");
const Column = require("../../models/Column");
const Task = require("../../models/Task");
const Comment = require("../../models/Comment");
const jwt = require("jsonwebtoken");

describe("Comment Integration Tests", () => {
  let userToken;
  let user;
  let board;
  let column;
  let task;

  beforeEach(async () => {
    user = await User.create({
      username: "boardowner",
      email: "owner@test.com",
      password: "password123",
    });

    userToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    board = await Board.create({
      title: "Board Project",
      user: user._id,
    });

    column = await Column.create({
      title: "To Do",
      board: board._id,
      position: 0,
    });

    board.columns = [column._id];
    await board.save();

    task = await Task.create({
      title: "Task with Comments",
      column: column._id,
      createdBy: user._id,
    });

    column.tasks = [task._id];
    await column.save();
  });

  // ─── Add Comment ───
  describe("POST /api/tasks/:taskId/comments", () => {
    it("should add a comment, push reference to task, and return comment details", async () => {
      const response = await request(app)
        .post(`/api/tasks/${task._id}/comments`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ content: "This task needs immediate attention." })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("content", "This task needs immediate attention.");
      expect(response.body.data.author).toHaveProperty("username", user.username);

      const commentId = response.body.data._id;

      // Verify DB comment collection
      const comment = await Comment.findById(commentId);
      expect(comment).toBeTruthy();

      // Verify task's comments list has the new comment ID
      const updatedTask = await Task.findById(task._id);
      expect(updatedTask.comments.map((id) => id.toString())).toContain(commentId);
    });
  });

  // ─── Get Comments ───
  describe("GET /api/tasks/:taskId/comments", () => {
    it("should return all comments on a task sorted by newest first", async () => {
      const comment1 = await Comment.create({
        content: "First comment",
        author: user._id,
        task: task._id,
        createdAt: new Date(Date.now() - 10000), // 10s ago
      });

      const comment2 = await Comment.create({
        content: "Second comment",
        author: user._id,
        task: task._id,
        createdAt: new Date(), // just now
      });

      // Update task's comments array
      task.comments = [comment1._id, comment2._id];
      await task.save();

      const response = await request(app)
        .get(`/api/tasks/${task._id}/comments`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveLength(2);
      // Newest should be first (comment2)
      expect(response.body.data[0]._id.toString()).toBe(comment2._id.toString());
      expect(response.body.data[1]._id.toString()).toBe(comment1._id.toString());
    });
  });

  // ─── Delete Comment ───
  describe("DELETE /api/comments/:commentId", () => {
    it("should allow author to delete comment and pull it from the task comments list", async () => {
      const comment = await Comment.create({
        content: "Disposable comment",
        author: user._id,
        task: task._id,
      });

      task.comments = [comment._id];
      await task.save();

      await request(app)
        .delete(`/api/comments/${comment._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      // Verify comment is removed from comments collection
      expect(await Comment.findById(comment._id)).toBeNull();

      // Verify comment is pulled from task's comments list
      const updatedTask = await Task.findById(task._id);
      expect(updatedTask.comments).not.toContainEqual(comment._id);
    });
  });
});
