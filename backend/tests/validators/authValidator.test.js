const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../../middleware/validators/authValidator");

describe("Auth Validators", () => {
  // ═══════════════════════════════════════
  // registerSchema
  // ═══════════════════════════════════════
  describe("registerSchema", () => {
    const validData = {
      body: {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      },
    };

    it("should pass with valid registration data", async () => {
      const result = await registerSchema.parseAsync(validData);
      expect(result.body.username).toBe("testuser");
    });

    it("should trim whitespace from username and email", async () => {
      const result = await registerSchema.parseAsync({
        body: { username: "  testuser  ", email: "  test@example.com  ", password: "password123" },
      });
      expect(result.body.username).toBe("testuser");
      expect(result.body.email).toBe("test@example.com");
    });

    // ─── Unhappy ───
    it("should reject when username is missing", async () => {
      await expect(
        registerSchema.parseAsync({ body: { email: "a@b.com", password: "123456" } })
      ).rejects.toThrow();
    });

    it("should reject when username is too short (< 3 chars)", async () => {
      await expect(
        registerSchema.parseAsync({ body: { username: "ab", email: "a@b.com", password: "123456" } })
      ).rejects.toThrow(/at least 3 characters/i);
    });

    it("should reject when username exceeds 30 characters", async () => {
      await expect(
        registerSchema.parseAsync({ body: { username: "a".repeat(31), email: "a@b.com", password: "123456" } })
      ).rejects.toThrow(/30 characters/i);
    });

    it("should reject when email is invalid", async () => {
      await expect(
        registerSchema.parseAsync({ body: { username: "user", email: "not-email", password: "123456" } })
      ).rejects.toThrow(/email/i);
    });

    it("should reject when email is missing", async () => {
      await expect(
        registerSchema.parseAsync({ body: { username: "user", password: "123456" } })
      ).rejects.toThrow();
    });

    it("should reject when password is missing", async () => {
      await expect(
        registerSchema.parseAsync({ body: { username: "user", email: "a@b.com" } })
      ).rejects.toThrow();
    });

    it("should reject when password is too short (< 6 chars)", async () => {
      await expect(
        registerSchema.parseAsync({ body: { username: "user", email: "a@b.com", password: "12345" } })
      ).rejects.toThrow(/6 characters/i);
    });
  });

  // ═══════════════════════════════════════
  // loginSchema
  // ═══════════════════════════════════════
  describe("loginSchema", () => {
    it("should pass with valid login data", async () => {
      const result = await loginSchema.parseAsync({
        body: { email: "test@example.com", password: "password123" },
      });
      expect(result.body.email).toBe("test@example.com");
    });

    it("should reject when email is missing", async () => {
      await expect(
        loginSchema.parseAsync({ body: { password: "123456" } })
      ).rejects.toThrow();
    });

    it("should reject when email is invalid", async () => {
      await expect(
        loginSchema.parseAsync({ body: { email: "bad", password: "123456" } })
      ).rejects.toThrow(/email/i);
    });

    it("should reject when password is missing", async () => {
      await expect(
        loginSchema.parseAsync({ body: { email: "a@b.com" } })
      ).rejects.toThrow();
    });

    it("should reject when password is empty string", async () => {
      await expect(
        loginSchema.parseAsync({ body: { email: "a@b.com", password: "" } })
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════
  // forgotPasswordSchema
  // ═══════════════════════════════════════
  describe("forgotPasswordSchema", () => {
    it("should pass with valid email", async () => {
      const result = await forgotPasswordSchema.parseAsync({
        body: { email: "test@example.com" },
      });
      expect(result.body.email).toBe("test@example.com");
    });

    it("should reject when email is invalid", async () => {
      await expect(
        forgotPasswordSchema.parseAsync({ body: { email: "invalid" } })
      ).rejects.toThrow(/email/i);
    });

    it("should reject when email is missing", async () => {
      await expect(
        forgotPasswordSchema.parseAsync({ body: {} })
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════
  // resetPasswordSchema
  // ═══════════════════════════════════════
  describe("resetPasswordSchema", () => {
    it("should pass with valid token and password", async () => {
      const result = await resetPasswordSchema.parseAsync({
        params: { resetToken: "abc123" },
        body: { password: "newpassword" },
      });
      expect(result.params.resetToken).toBe("abc123");
    });

    it("should reject when resetToken param is missing", async () => {
      await expect(
        resetPasswordSchema.parseAsync({ params: {}, body: { password: "newpassword" } })
      ).rejects.toThrow();
    });

    it("should reject when password is too short", async () => {
      await expect(
        resetPasswordSchema.parseAsync({ params: { resetToken: "abc" }, body: { password: "12345" } })
      ).rejects.toThrow(/6 characters/i);
    });

    it("should reject when password is missing", async () => {
      await expect(
        resetPasswordSchema.parseAsync({ params: { resetToken: "abc" }, body: {} })
      ).rejects.toThrow();
    });
  });
});
