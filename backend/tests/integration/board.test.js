require("./setup");
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Board = require("../../models/Board");
const Column = require("../../models/Column");
const jwt = require("jsonwebtoken");

describe("Board Integration Tests", () => {
  let userToken;
  let user;

  beforeEach(async () => {
    user = await User.create({
      username: "boardowner",
      email: "owner@test.com",
      password: "password123",
    });

    userToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
  });

  // ─── Create Board ───
  describe("POST /api/boards", () => {
    it("should create a board and auto-populate 4 default columns in DB", async () => {
      const response = await request(app)
        .post("/api/boards")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ title: "Agile Sprint Board" })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("title", "Agile Sprint Board");
      expect(response.body.data).toHaveProperty("user", user._id.toString());

      const boardId = response.body.data._id;

      // Verify the board exists in the database
      const board = await Board.findById(boardId);
      expect(board).toBeTruthy();

      // Verify that the 4 default columns were created and linked to the board
      const columns = await Column.find({ board: boardId }).sort("position");
      expect(columns).toHaveLength(4);
      expect(columns.map((c) => c.title)).toEqual([
        "To Do",
        "In Progress",
        "Review",
        "Done",
      ]);
    });

    it("should return 401 when no token is provided", async () => {
      await request(app)
        .post("/api/boards")
        .send({ title: "No Auth Board" })
        .expect(401);
    });
  });

  // ─── Member Invitation and Access Control ───
  describe("POST /api/boards/:boardId/invite", () => {
    let board;
    let otherUser;

    beforeEach(async () => {
      board = await Board.create({
        title: "Collaboration Board",
        user: user._id,
      });

      otherUser = await User.create({
        username: "coworker",
        email: "coworker@test.com",
        password: "password123",
      });
    });

    it("should allow board owner to invite a registered user to the board", async () => {
      const response = await request(app)
        .post(`/api/boards/${board._id}/invite`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ email: otherUser.email })
        .expect(200);

      expect(response.body).toHaveProperty("message", "User invited successfully");

      // Verify DB state
      const updatedBoard = await Board.findById(board._id);
      expect(updatedBoard.coworkers.map((id) => id.toString())).toContain(
        otherUser._id.toString()
      );
    });

    it("should prevent non-owners from inviting members to the board", async () => {
      const nonOwnerToken = jwt.sign({ id: otherUser._id }, process.env.JWT_SECRET);

      const response = await request(app)
        .post(`/api/boards/${board._id}/invite`)
        .set("Authorization", `Bearer ${nonOwnerToken}`)
        .send({ email: "random@test.com" })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/only the board owner/i);
    });
  });

  // ─── Delete Board ───
  describe("DELETE /api/boards/:id", () => {
    let board;

    beforeEach(async () => {
      board = await Board.create({
        title: "Disposable Board",
        user: user._id,
      });

      // Create a column belonging to this board
      await Column.create({
        title: "Test Col",
        board: board._id,
        position: 0,
      });
    });

    it("should delete the board and cascade delete its columns", async () => {
      await request(app)
        .delete(`/api/boards/${board._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      // Verify board is deleted
      const foundBoard = await Board.findById(board._id);
      expect(foundBoard).toBeNull();

      // Verify columns are deleted (cascade)
      const columns = await Column.find({ board: board._id });
      expect(columns).toHaveLength(0);
    });
  });
});
