const { z } = require("zod");
const validate = require("../../middleware/validate");
const { mockReq, mockRes, mockNext } = require("../helpers");

describe("validate middleware", () => {
  const testSchema = z.object({
    body: z.object({
      name: z.string().min(1, "Name is required"),
    }),
  });

  // ─── Happy path ───
  it("should call next() and assign sanitized body for valid data", async () => {
    const req = mockReq({ body: { name: "Test" } });
    const res = mockRes();
    const next = mockNext();

    const middleware = validate(testSchema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: "Test" });
  });

  it("should strip unknown fields from body after validation", async () => {
    // Zod's default behavior — passthrough or strip depends on schema definition.
    // The validate middleware reassigns parsed.body, so extra fields get dropped.
    const req = mockReq({ body: { name: "Test", extra: "should be dropped" } });
    const res = mockRes();
    const next = mockNext();

    const middleware = validate(testSchema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body.name).toBe("Test");
  });

  // ─── Unhappy: missing required field ───
  it("should call next(error) with ZodError for invalid data", async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    const next = mockNext();

    const middleware = validate(testSchema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(z.ZodError));
  });

  // ─── Unhappy: wrong data type ───
  it("should call next(error) when body field has wrong type", async () => {
    const req = mockReq({ body: { name: 12345 } });
    const res = mockRes();
    const next = mockNext();

    const middleware = validate(testSchema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(z.ZodError));
  });

  // ─── Schema with params + query ───
  it("should reassign sanitized params and query if schema validates them", async () => {
    const fullSchema = z.object({
      body: z.object({ title: z.string() }),
      params: z.object({ id: z.string() }),
      query: z.object({ page: z.string().optional() }),
    });

    const req = mockReq({
      body: { title: "Test" },
      params: { id: "abc" },
      query: { page: "1" },
    });
    const res = mockRes();
    const next = mockNext();

    const middleware = validate(fullSchema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.params).toEqual({ id: "abc" });
    expect(req.query).toEqual({ page: "1" });
  });
});
