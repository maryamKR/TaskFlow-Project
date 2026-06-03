require("./setup");
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Board = require("../../models/Board");
const Column = require("../../models/Column");
const Task = require("../../models/Task");
const jwt = require("jsonwebtoken");

describe("Column Integration Tests", () => {
  let userToken;
  let user;
  let board;

  beforeEach(async () => {
    user = await User.create({
      username: "boardowner",
      email: "owner@test.com",
      password: "password123",
    });

    userToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    board = await Board.create({
      title: "Agile Project",
      user: user._id,
      columns: [],
    });
  });

  // ─── Create Column ───
  describe("POST /api/columns", () => {
    it("should create a column and push it to board's column reference list", async () => {
      const response = await request(app)
        .post("/api/columns")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          title: "Backlog",
          boardId: board._id.toString(),
        })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("title", "Backlog");

      const columnId = response.body.data._id;

      // Verify the column is present in the columns collection
      const col = await Column.findById(columnId);
      expect(col).toBeTruthy();
      expect(col.board.toString()).toBe(board._id.toString());

      // Verify the board updated its columns array to include the new column
      const updatedBoard = await Board.findById(board._id);
      expect(updatedBoard.columns.map((id) => id.toString())).toContain(columnId);
    });
  });

  // ─── Get Columns By Board ───
  describe("GET /api/columns/board/:boardId", () => {
    it("should return all columns for the board sorted by position", async () => {
      const col1 = await Column.create({ title: "Col A", board: board._id, position: 1 });
      const col2 = await Column.create({ title: "Col B", board: board._id, position: 0 });

      const response = await request(app)
        .get(`/api/columns/board/${board._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveLength(2);
      // Col B should be first because its position is 0 (sorted ascending)
      expect(response.body.data[0]._id.toString()).toBe(col2._id.toString());
      expect(response.body.data[1]._id.toString()).toBe(col1._id.toString());
    });
  });

  // ─── Reorder Columns ───
  describe("PUT /api/boards/:boardId/reorder", () => {
    it("should reorder the board columns array", async () => {
      const col1 = await Column.create({ title: "Todo", board: board._id, position: 0 });
      const col2 = await Column.create({ title: "Doing", board: board._id, position: 1 });
      
      // Update board with column references
      board.columns = [col1._id, col2._id];
      await board.save();

      // Send reorder payload (reverse order)
      const response = await request(app)
        .put(`/api/boards/${board._id}/reorder`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ columnIds: [col2._id.toString(), col1._id.toString()] })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);

      // Verify DB order updated
      const updatedBoard = await Board.findById(board._id);
      expect(updatedBoard.columns.map((id) => id.toString())).toEqual([
        col2._id.toString(),
        col1._id.toString(),
      ]);
    });
  });

  // ─── Delete Column ───
  describe("DELETE /api/columns/:id", () => {
    it("should delete column, remove its reference from board, and cascade delete tasks", async () => {
      const col = await Column.create({ title: "Trash", board: board._id, position: 0 });
      board.columns.push(col._id);
      await board.save();

      // Create a task inside this column
      const task = await Task.create({
        title: "Garbage Task",
        column: col._id,
        createdBy: user._id,
      });

      col.tasks.push(task._id);
      await col.save();

      await request(app)
        .delete(`/api/columns/${col._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      // Verify column is deleted
      expect(await Column.findById(col._id)).toBeNull();

      // Verify task is deleted (cascade)
      expect(await Task.findById(task._id)).toBeNull();

      // Verify board removed column reference
      const updatedBoard = await Board.findById(board._id);
      expect(updatedBoard.columns).not.toContainEqual(col._id);
    });
  });
});
