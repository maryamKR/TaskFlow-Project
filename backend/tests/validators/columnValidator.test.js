const {
  createColumnSchema,
  getColumnsSchema,
  columnIdParamSchema,
} = require("../../middleware/validators/columnValidator");
const { fakeId } = require("../helpers");

describe("Column Validators", () => {
  describe("createColumnSchema", () => {
    it("should pass with valid title and boardId", async () => {
      const result = await createColumnSchema.parseAsync({
        body: { title: "To Do", boardId: fakeId(1) },
      });
      expect(result.body.title).toBe("To Do");
    });

    it("should trim whitespace from title", async () => {
      const result = await createColumnSchema.parseAsync({
        body: { title: "  In Progress  ", boardId: fakeId(1) },
      });
      expect(result.body.title).toBe("In Progress");
    });

    it("should reject when title is missing", async () => {
      await expect(createColumnSchema.parseAsync({ body: { boardId: fakeId(1) } })).rejects.toThrow();
    });

    it("should reject when title is empty string", async () => {
      await expect(createColumnSchema.parseAsync({ body: { title: "", boardId: fakeId(1) } })).rejects.toThrow();
    });

    it("should reject when boardId has invalid format", async () => {
      await expect(createColumnSchema.parseAsync({ body: { title: "Col", boardId: "bad" } })).rejects.toThrow(/Invalid Board ID/i);
    });
  });

  describe("getColumnsSchema", () => {
    it("should pass with valid boardId param", async () => {
      const result = await getColumnsSchema.parseAsync({ params: { boardId: fakeId(1) } });
      expect(result.params.boardId).toBe(fakeId(1));
    });

    it("should reject invalid boardId param", async () => {
      await expect(getColumnsSchema.parseAsync({ params: { boardId: "nope" } })).rejects.toThrow(/Invalid Board ID/i);
    });
  });

  describe("columnIdParamSchema", () => {
    it("should pass with valid id param", async () => {
      const result = await columnIdParamSchema.parseAsync({ params: { id: fakeId(1) } });
      expect(result.params.id).toBe(fakeId(1));
    });

    it("should reject invalid id param", async () => {
      await expect(columnIdParamSchema.parseAsync({ params: { id: "invalid" } })).rejects.toThrow(/Invalid Column ID/i);
    });
  });
});
