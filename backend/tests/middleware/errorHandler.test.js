const { ZodError } = require("zod");
const errorHandler = require("../../middleware/errorHandler");
const { mockReq, mockRes, mockNext } = require("../helpers");

describe("errorHandler middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = mockReq();
    res = mockRes();
    next = mockNext();
  });

  // ─── Happy-ish: generic error with message ───
  it("should return 500 with error message when res.statusCode is 200 (default)", () => {
    const err = new Error("Something broke");
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Something broke",
    });
  });

  it("should preserve non-200 status code already set on res", () => {
    res.statusCode = 422;
    const err = new Error("Validation failed");
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it("should use 'Internal Server Error' when error has no message", () => {
    const err = new Error();
    err.message = "";
    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Internal Server Error" })
    );
  });

  // ─── ZodError ───
  it("should return 400 for ZodError with joined issue messages", () => {
    const err = new ZodError([
      { code: "too_small", minimum: 3, type: "string", inclusive: true, exact: false, message: "Too short", path: ["username"] },
      { code: "invalid_type", expected: "string", received: "undefined", message: "Required", path: ["email"] },
    ]);

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Too short, Required",
    });
  });

  // ─── MongoDB duplicate key error (code 11000) ───
  it("should return 400 for duplicate key error with field name capitalized", () => {
    const err = new Error("Duplicate key");
    err.code = 11000;
    err.keyValue = { email: "test@test.com" };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Email already exists.",
    });
  });

  // ─── Mongoose ValidationError ───
  it("should return 400 for Mongoose ValidationError with joined messages", () => {
    const err = new Error("Validation failed");
    err.name = "ValidationError";
    err.errors = {
      title: { message: "Title is required" },
      priority: { message: "Invalid priority" },
    };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Title is required, Invalid priority",
    });
  });

  // ─── CastError ───
  it("should return 400 for CastError with the invalid ID format", () => {
    const err = new Error("Cast failed");
    err.name = "CastError";
    err.value = "invalid-id-123";

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Invalid ID format: invalid-id-123",
    });
  });

  // ─── JsonWebTokenError ───
  it("should return 401 for JsonWebTokenError", () => {
    const err = new Error("jwt malformed");
    err.name = "JsonWebTokenError";

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Not authorized, token failed.",
    });
  });

  // ─── TokenExpiredError ───
  it("should return 401 for TokenExpiredError", () => {
    const err = new Error("jwt expired");
    err.name = "TokenExpiredError";

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Session expired, please log in again.",
    });
  });

  // ─── Uniform payload structure ───
  it("should always return { success: false, error: ... } shape", () => {
    const err = new Error("Any error");
    errorHandler(err, req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload).toHaveProperty("success", false);
    expect(payload).toHaveProperty("error");
  });

  // ─── NODE_ENV === 'production' masking ───
  describe("when in production", () => {
    let originalEnv;

    beforeAll(() => {
      originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
    });

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("should mask 500 error messages with 'Internal Server Error'", () => {
      const err = new Error("Sensitive database query failure error log");
      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Internal Server Error",
      });
    });

    it("should NOT mask non-500 error messages (e.g. validation/client errors)", () => {
      res.statusCode = 403;
      const err = new Error("Only the board owner can perform this action");
      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Only the board owner can perform this action",
      });
    });
  });
});
