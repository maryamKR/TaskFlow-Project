const {
  createBoardSchema,
  inviteMemberSchema,
  reorderColumnsSchema,
  boardIdParamSchema,
  boardMemberParamSchema,
} = require("../../middleware/validators/boardValidator");
const { fakeId } = require("../helpers");

describe("Board Validators", () => {
  // ═══════════════════════════════════════
  // createBoardSchema
  // ═══════════════════════════════════════
  describe("createBoardSchema", () => {
    it("should pass with valid title", async () => {
      const result = await createBoardSchema.parseAsync({ body: { title: "My Board" } });
      expect(result.body.title).toBe("My Board");
    });

    it("should pass with title and valid coworker IDs", async () => {
      const result = await createBoardSchema.parseAsync({
        body: { title: "Board", coworkers: [fakeId(1), fakeId(2)] },
      });
      expect(result.body.coworkers).toHaveLength(2);
    });

    it("should pass when coworkers is omitted (optional)", async () => {
      const result = await createBoardSchema.parseAsync({ body: { title: "Board" } });
      expect(result.body.coworkers).toBeUndefined();
    });

    it("should reject when title is missing", async () => {
      await expect(createBoardSchema.parseAsync({ body: {} })).rejects.toThrow();
    });

    it("should reject when title is empty string", async () => {
      await expect(createBoardSchema.parseAsync({ body: { title: "" } })).rejects.toThrow();
    });

    it("should reject when title exceeds 50 characters", async () => {
      await expect(
        createBoardSchema.parseAsync({ body: { title: "x".repeat(51) } })
      ).rejects.toThrow(/50 characters/i);
    });

    it("should reject when coworker IDs have invalid format", async () => {
      await expect(
        createBoardSchema.parseAsync({ body: { title: "Board", coworkers: ["not-an-id"] } })
      ).rejects.toThrow(/Invalid User ID/i);
    });
  });

  // ═══════════════════════════════════════
  // inviteMemberSchema
  // ═══════════════════════════════════════
  describe("inviteMemberSchema", () => {
    it("should pass with valid email and boardId", async () => {
      const result = await inviteMemberSchema.parseAsync({
        body: { email: "user@test.com" },
        params: { boardId: fakeId(1) },
      });
      expect(result.body.email).toBe("user@test.com");
    });

    it("should reject invalid email", async () => {
      await expect(
        inviteMemberSchema.parseAsync({ body: { email: "bad" }, params: { boardId: fakeId(1) } })
      ).rejects.toThrow(/email/i);
    });

    it("should reject invalid boardId format", async () => {
      await expect(
        inviteMemberSchema.parseAsync({ body: { email: "a@b.com" }, params: { boardId: "invalid" } })
      ).rejects.toThrow(/Invalid Board ID/i);
    });
  });

  // ═══════════════════════════════════════
  // reorderColumnsSchema
  // ═══════════════════════════════════════
  describe("reorderColumnsSchema", () => {
    it("should pass with valid columnIds and boardId", async () => {
      const result = await reorderColumnsSchema.parseAsync({
        body: { columnIds: [fakeId(1), fakeId(2)] },
        params: { boardId: fakeId(3) },
      });
      expect(result.body.columnIds).toHaveLength(2);
    });

    it("should reject invalid column ID format", async () => {
      await expect(
        reorderColumnsSchema.parseAsync({
          body: { columnIds: ["bad-id"] },
          params: { boardId: fakeId(1) },
        })
      ).rejects.toThrow(/Invalid Column ID/i);
    });

    it("should reject invalid boardId param", async () => {
      await expect(
        reorderColumnsSchema.parseAsync({
          body: { columnIds: [fakeId(1)] },
          params: { boardId: "nope" },
        })
      ).rejects.toThrow(/Invalid Board ID/i);
    });
  });

  // ═══════════════════════════════════════
  // boardIdParamSchema
  // ═══════════════════════════════════════
  describe("boardIdParamSchema", () => {
    it("should pass with valid 'id' param", async () => {
      const result = await boardIdParamSchema.parseAsync({ params: { id: fakeId(1) } });
      expect(result.params.id).toBe(fakeId(1));
    });

    it("should pass with valid 'boardId' param", async () => {
      const result = await boardIdParamSchema.parseAsync({ params: { boardId: fakeId(1) } });
      expect(result.params.boardId).toBe(fakeId(1));
    });

    it("should reject when neither id nor boardId is provided", async () => {
      await expect(boardIdParamSchema.parseAsync({ params: {} })).rejects.toThrow();
    });

    it("should reject with invalid id format", async () => {
      await expect(boardIdParamSchema.parseAsync({ params: { id: "bad" } })).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════
  // boardMemberParamSchema
  // ═══════════════════════════════════════
  describe("boardMemberParamSchema", () => {
    it("should pass with valid boardId and memberId", async () => {
      const result = await boardMemberParamSchema.parseAsync({
        params: { boardId: fakeId(1), memberId: fakeId(2) },
      });
      expect(result.params.memberId).toBe(fakeId(2));
    });

    it("should reject invalid boardId", async () => {
      await expect(
        boardMemberParamSchema.parseAsync({ params: { boardId: "bad", memberId: fakeId(1) } })
      ).rejects.toThrow(/Invalid Board ID/i);
    });

    it("should reject invalid memberId", async () => {
      await expect(
        boardMemberParamSchema.parseAsync({ params: { boardId: fakeId(1), memberId: "bad" } })
      ).rejects.toThrow(/Invalid Member ID/i);
    });
  });
});
