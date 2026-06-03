require("./setup");
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Board = require("../../models/Board");

describe("Auth Integration Tests", () => {
  const registerPayload = {
    username: "integrationuser",
    email: "integration@test.com",
    password: "password123",
  };

  // ─── Registration ───
  describe("POST /api/auth/register", () => {
    it("should register a new user, hash password, and return a JWT", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send(registerPayload)
        .expect(201);

      // Verify the flat response payload returned directly by auth routes
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("username", registerPayload.username);
      expect(response.body).not.toHaveProperty("password");

      // Verify user was stored in the database with hashed password
      const user = await User.findOne({ email: registerPayload.email });
      expect(user).toBeTruthy();
      expect(user.username).toBe(registerPayload.username);
      expect(user.password).not.toBe(registerPayload.password); // must be hashed
    });

    it("should return 400 for duplicate email/username registration", async () => {
      // Register first user
      await request(app).post("/api/auth/register").send(registerPayload);

      // Attempt to register again
      const response = await request(app)
        .post("/api/auth/register")
        .send(registerPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/exists/i);
    });

    it("should auto-join pending board invites upon registration", async () => {
      // Create a board with a pending invite for our email
      const inviter = await User.create({
        username: "inviter",
        email: "inviter@test.com",
        password: "password123",
      });

      const board = await Board.create({
        title: "Invited Board",
        user: inviter._id,
        pendingInvites: [registerPayload.email],
      });

      // Register the invited user
      const response = await request(app)
        .post("/api/auth/register")
        .send(registerPayload)
        .expect(201);

      const userId = response.body._id;

      // Verify the board's coworkers array contains the newly registered user ID
      const updatedBoard = await Board.findById(board._id);
      expect(updatedBoard.coworkers.map((id) => id.toString())).toContain(userId);
      expect(updatedBoard.pendingInvites).not.toContain(registerPayload.email);
    });
  });

  // ─── Login ───
  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Register user in DB directly
      await User.create(registerPayload);
    });

    it("should authenticate valid user credentials and return a token", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: registerPayload.email,
          password: registerPayload.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty("token");
    });

    it("should return 401 for incorrect password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: registerPayload.email,
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid/i);
    });

    it("should return 401 for non-existent email", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "missing@test.com",
          password: "password123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ─── Rate Limiting ───
  describe("Rate Limiting", () => {
    const { loginLimiter, registerLimiter } = require("../../middleware/rateLimiter");

    afterEach(() => {
      // Reset limiters to avoid pollution in subsequent tests
      loginLimiter.resetKey("::ffff:127.0.0.1");
      loginLimiter.resetKey("127.0.0.1");
      registerLimiter.resetKey("::ffff:127.0.0.1");
      registerLimiter.resetKey("127.0.0.1");
    });

    it("should block requests with 429 after exceeding login rate limit", async () => {
      // loginLimiter is set to max 10 requests per 15 minutes
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post("/api/auth/login")
          .send({ email: "rate@limit.com", password: "password" });
      }

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "rate@limit.com", password: "password" })
        .expect(429);

      expect(response.body.error).toMatch(/too many login attempts/i);
    });
  });
});
