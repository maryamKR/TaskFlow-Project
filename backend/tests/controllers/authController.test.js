const { registerUser, loginUser, forgotPassword, resetPassword } = require("../../controllers/authController");
const User = require("../../models/User");
const Board = require("../../models/Board");
const jwt = require("jsonwebtoken");
const { sendPasswordResetEmail } = require("../../utils/emailService");
const notifyAndEmit = require("../../utils/notifyAndEmit");
const { notifyOwner } = require("../../utils/notifyOwner");
const { mockReq, mockRes, fakeId } = require("../helpers");

jest.mock("../../models/User");
jest.mock("../../models/Board");
jest.mock("jsonwebtoken");
jest.mock("../../utils/emailService");
jest.mock("../../utils/notifyAndEmit");
jest.mock("../../utils/notifyOwner");

describe("authController", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.FRONTEND_URL = "http://localhost:3000";
  });

  // ═══════════════════════════════════════
  // registerUser
  // ═══════════════════════════════════════
  describe("registerUser", () => {
    it("should register a new user and return token (201)", async () => {
      const req = mockReq({ body: { username: "newuser", email: "new@test.com", password: "123456" } });
      const res = mockRes();

      User.findOne.mockResolvedValue(null);
      const mockUser = { _id: fakeId(1), username: "newuser", email: "new@test.com" };
      User.create.mockResolvedValue(mockUser);
      Board.find.mockResolvedValue([]);
      jwt.sign.mockReturnValue("mock-token");

      await registerUser(req, res);

      expect(User.create).toHaveBeenCalledWith({ username: "newuser", email: "new@test.com", password: "123456" });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: "mock-token" }));
    });

    it("should auto-join pending board invites on registration", async () => {
      const req = mockReq({ body: { username: "newuser", email: "invited@test.com", password: "123456" } });
      const res = mockRes();

      User.findOne.mockResolvedValue(null);
      const mockUser = { _id: fakeId(1), username: "newuser", email: "invited@test.com" };
      User.create.mockResolvedValue(mockUser);

      const mockBoard = {
        _id: fakeId(5),
        title: "Team Board",
        user: fakeId(2),
        coworkers: [],
        pendingInvites: ["invited@test.com"],
        save: jest.fn(),
      };
      mockBoard.coworkers.addToSet = function (item) {
        if (!this.includes(item)) {
          this.push(item);
        }
        return this;
      };
      // coworkers.some check
      mockBoard.coworkers.some = jest.fn().mockReturnValue(false);
      Board.find.mockResolvedValue([mockBoard]);
      notifyAndEmit.mockResolvedValue({});
      notifyOwner.mockResolvedValue(undefined);
      jwt.sign.mockReturnValue("token");

      await registerUser(req, res);

      expect(mockBoard.coworkers).toContain(mockUser._id);
      expect(mockBoard.save).toHaveBeenCalled();
      expect(notifyAndEmit).toHaveBeenCalled();
    });

    it("should throw 400 when user already exists", async () => {
      const req = mockReq({ body: { username: "dup", email: "dup@test.com", password: "123456" } });
      const res = mockRes();

      User.findOne.mockResolvedValue({ _id: fakeId(1) });

      await expect(registerUser(req, res)).rejects.toThrow("User with this email or username already exists");
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ═══════════════════════════════════════
  // loginUser
  // ═══════════════════════════════════════
  describe("loginUser", () => {
    it("should login successfully and return token", async () => {
      const req = mockReq({ body: { email: "test@test.com", password: "123456" } });
      const res = mockRes();

      const mockUser = {
        _id: fakeId(1),
        username: "testuser",
        email: "test@test.com",
        matchPassword: jest.fn().mockResolvedValue(true),
      };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
      jwt.sign.mockReturnValue("mock-token");

      await loginUser(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: "mock-token" }));
    });

    it("should throw 401 when email not found", async () => {
      const req = mockReq({ body: { email: "missing@test.com", password: "123456" } });
      const res = mockRes();

      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      await expect(loginUser(req, res)).rejects.toThrow("Invalid email or password");
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should throw 401 when password does not match", async () => {
      const req = mockReq({ body: { email: "test@test.com", password: "wrong" } });
      const res = mockRes();

      const mockUser = { matchPassword: jest.fn().mockResolvedValue(false) };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });

      await expect(loginUser(req, res)).rejects.toThrow("Invalid email or password");
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ═══════════════════════════════════════
  // forgotPassword
  // ═══════════════════════════════════════
  describe("forgotPassword", () => {
    it("should send reset email for existing user", async () => {
      const req = mockReq({ body: { email: "test@test.com" } });
      const res = mockRes();

      const mockUser = {
        email: "test@test.com",
        save: jest.fn(),
        resetPasswordToken: undefined,
        resetPasswordExpire: undefined,
      };
      User.findOne.mockResolvedValue(mockUser);
      sendPasswordResetEmail.mockResolvedValue(undefined);

      await forgotPassword(req, res);

      expect(sendPasswordResetEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 200 even if email is not found (no enumeration leak)", async () => {
      const req = mockReq({ body: { email: "unknown@test.com" } });
      const res = mockRes();

      User.findOne.mockResolvedValue(null);

      await forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("should throw 500 when email sending fails", async () => {
      const req = mockReq({ body: { email: "test@test.com" } });
      const res = mockRes();

      const mockUser = {
        email: "test@test.com",
        save: jest.fn(),
        resetPasswordToken: undefined,
        resetPasswordExpire: undefined,
      };
      User.findOne.mockResolvedValue(mockUser);
      sendPasswordResetEmail.mockRejectedValue(new Error("SMTP down"));

      await expect(forgotPassword(req, res)).rejects.toThrow("Email could not be sent");
      expect(mockUser.resetPasswordToken).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════
  // resetPassword
  // ═══════════════════════════════════════
  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      const req = mockReq({
        params: { resetToken: "abc123" },
        body: { password: "newpassword" },
      });
      const res = mockRes();

      const mockUser = {
        save: jest.fn(),
        password: undefined,
        resetPasswordToken: "hashed",
        resetPasswordExpire: undefined,
      };
      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });

      await resetPassword(req, res);

      expect(mockUser.password).toBe("newpassword");
      expect(mockUser.resetPasswordToken).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should throw 400 when token is invalid or expired", async () => {
      const req = mockReq({
        params: { resetToken: "expired-token" },
        body: { password: "newpassword" },
      });
      const res = mockRes();

      User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      await expect(resetPassword(req, res)).rejects.toThrow("Invalid token or token expired");
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
