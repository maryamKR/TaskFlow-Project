const {
  addCommentSchema,
  getCommentsSchema,
  deleteCommentSchema,
} = require("../../middleware/validators/commentValidator");
const { fakeId } = require("../helpers");

describe("Comment Validators", () => {
  describe("addCommentSchema", () => {
    it("should pass with valid content and taskId", async () => {
      const result = await addCommentSchema.parseAsync({
        body: { content: "Great work!" },
        params: { taskId: fakeId(1) },
      });
      expect(result.body.content).toBe("Great work!");
    });

    it("should trim whitespace from content", async () => {
      const result = await addCommentSchema.parseAsync({
        body: { content: "  trimmed  " },
        params: { taskId: fakeId(1) },
      });
      expect(result.body.content).toBe("trimmed");
    });

    it("should reject when content is missing", async () => {
      await expect(addCommentSchema.parseAsync({ body: {}, params: { taskId: fakeId(1) } })).rejects.toThrow();
    });

    it("should reject when content is empty string", async () => {
      await expect(addCommentSchema.parseAsync({ body: { content: "" }, params: { taskId: fakeId(1) } })).rejects.toThrow();
    });

    it("should reject when content exceeds 1000 characters", async () => {
      await expect(
        addCommentSchema.parseAsync({ body: { content: "x".repeat(1001) }, params: { taskId: fakeId(1) } })
      ).rejects.toThrow(/1000/);
    });

    it("should reject invalid taskId format", async () => {
      await expect(
        addCommentSchema.parseAsync({ body: { content: "ok" }, params: { taskId: "bad" } })
      ).rejects.toThrow(/Invalid Task ID/i);
    });
  });

  describe("getCommentsSchema", () => {
    it("should pass with valid taskId", async () => {
      const result = await getCommentsSchema.parseAsync({ params: { taskId: fakeId(1) } });
      expect(result.params.taskId).toBe(fakeId(1));
    });

    it("should reject invalid taskId", async () => {
      await expect(getCommentsSchema.parseAsync({ params: { taskId: "bad" } })).rejects.toThrow(/Invalid Task ID/i);
    });
  });

  describe("deleteCommentSchema", () => {
    it("should pass with valid commentId", async () => {
      const result = await deleteCommentSchema.parseAsync({ params: { commentId: fakeId(1) } });
      expect(result.params.commentId).toBe(fakeId(1));
    });

    it("should reject invalid commentId", async () => {
      await expect(deleteCommentSchema.parseAsync({ params: { commentId: "bad" } })).rejects.toThrow(/Invalid Comment ID/i);
    });
  });
});
