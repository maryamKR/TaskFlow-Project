require("./setup");
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Board = require("../../models/Board");
const { loginLimiter, registerLimiter } = require("../../middleware/rateLimiter");

describe("Auth Integration Tests", () => {
  const registerPayload = {
    username: "integrationuser",
    email: "integration@test.com",
    password: "password123",
  };

  afterEach(() => {
    // Reset rate limiters after every test to prevent 429 failures
    const testIp = "::ffff:127.0.0.1";
    loginLimiter.resetKey(testIp);
    loginLimiter.resetKey("127.0.0.1");
    registerLimiter.resetKey(testIp);
    registerLimiter.resetKey("127.0.0.1");
  });

  // ─── Registration ───
  describe("POST /api/auth/register", () => {
    it("should register a new user, hash password, and return a JWT in a secure cookie", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send(registerPayload)
        .expect(201);

      // Verify the cookie header
      expect(response.headers["set-cookie"]).toBeDefined();
      const cookie = response.headers["set-cookie"][0];
      expect(cookie).toMatch(/token=/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/); // In test/dev environment

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

    it("should authenticate valid user credentials and return a secure token cookie", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: registerPayload.email,
          password: registerPayload.password,
        })
        .expect(200);

      expect(response.headers["set-cookie"]).toBeDefined();
      const cookie = response.headers["set-cookie"][0];
      expect(cookie).toMatch(/token=/);
      expect(cookie).toMatch(/HttpOnly/);
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
  });

  // ─── Profile & Logout ───
  describe("Authenticated Endpoints (Cookie-based)", () => {
    let authCookie;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post("/api/auth/register")
        .send({
          username: "authuser",
          email: "auth@test.com",
          password: "password123"
        });
      
      if (loginRes.status !== 201) {
        console.error("Registration failed in beforeEach:", loginRes.body);
      }
      
      authCookie = loginRes.headers["set-cookie"] ? loginRes.headers["set-cookie"][0] : null;
    });

    it("should retrieve current user profile using cookie", async () => {
      expect(authCookie).toBeDefined();
      const response = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [authCookie])
        .expect(200);

      expect(response.body).toHaveProperty("username", "authuser");
      expect(response.body).toHaveProperty("email", "auth@test.com");
    });

    it("should successfully logout and clear the cookie", async () => {
      expect(authCookie).toBeDefined();
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", [authCookie])
        .expect(200);

      expect(response.headers["set-cookie"]).toBeDefined();
      const clearCookie = response.headers["set-cookie"][0];
      expect(clearCookie).toMatch(/token=;/); // empty value
      expect(clearCookie).toMatch(/Expires=/); // expired
    });

    it("should deny access to /me after logout", async () => {
      expect(authCookie).toBeDefined();
      // Logout first
      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", [authCookie]);
      
      const clearedCookie = logoutRes.headers["set-cookie"][0];

      // Attempt to get profile with cleared cookie
      await request(app)
        .get("/api/auth/me")
        .set("Cookie", [clearedCookie])
        .expect(401);
    });
  });

  // ─── Rate Limiting ───
  describe("Rate Limiting", () => {
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
