/**
 * Generate a valid 24-char hex string that looks like a Mongoose ObjectId.
 * Optionally accepts a seed digit (0-9) to create distinguishable IDs in tests.
 */
const fakeId = (seed = 1) =>
  seed.toString().padStart(24, "a".repeat(24));

/**
 * Build a mock Express request object.
 */
const mockReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: {
    _id: fakeId(1),
    username: "testuser",
    email: "test@example.com",
  },
  ...overrides,
});

/**
 * Build a mock Express response object with chainable status/json.
 */
const mockRes = () => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Build a mock next() function.
 */
const mockNext = () => jest.fn();

module.exports = { fakeId, mockReq, mockRes, mockNext };
