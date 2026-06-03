const jwt = require("jsonwebtoken");
const { protect } = require("../../middleware/authMiddleware");
const User = require("../../models/User");
const { mockReq, mockRes, mockNext, fakeId } = require("../helpers");

jest.mock("../../models/User");

describe("authMiddleware — protect", () => {
  let req, res, next;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    res = mockRes();
    next = mockNext();
  });

  // ─── Happy path ───
  it("should set req.user and call next() for a valid token", async () => {
    const userId = fakeId(1);
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);
    req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });

    const mockUser = { _id: userId, username: "testuser", email: "test@test.com" };
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });

    await protect(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalledWith();
  });

  // ─── Unhappy: no Authorization header at all ───
  it("should return 401 when no Authorization header is provided", async () => {
    req = mockReq({ headers: {} });

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── Unhappy: header present but no Bearer prefix ───
  it("should return 401 when Authorization header does not start with Bearer", async () => {
    req = mockReq({
      headers: { authorization: "Basic some-token" },
    });

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── Unhappy: invalid/malformed token ───
  it("should return 401 for an invalid token", async () => {
    req = mockReq({
      headers: { authorization: "Bearer invalidtoken123" },
    });

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── Unhappy: token signed with wrong secret ───
  it("should return 401 for a token signed with a different secret", async () => {
    const token = jwt.sign({ id: fakeId(1) }, "wrong-secret");
    req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── Unhappy: valid token but user was deleted from DB ───
  it("should return 401 when the user no longer exists in the database", async () => {
    const userId = fakeId(2);
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);
    req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });

    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ─── Unhappy: expired token ───
  it("should return 401 for an expired token", async () => {
    const token = jwt.sign({ id: fakeId(1) }, process.env.JWT_SECRET, { expiresIn: "0s" });
    req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });

    // Tiny delay to ensure the token is expired
    await new Promise((r) => setTimeout(r, 10));

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
