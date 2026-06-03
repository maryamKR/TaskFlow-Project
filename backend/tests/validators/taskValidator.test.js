const {
  createTaskSchema,
  updateTaskSchema,
  getTasksQuerySchema,
  moveTaskSchema,
  reorderTaskSchema,
} = require("../../middleware/validators/taskValidator");
const { fakeId } = require("../helpers");

describe("Task Validators", () => {
  // ═══════════════════════════════════════
  // createTaskSchema
  // ═══════════════════════════════════════
  describe("createTaskSchema", () => {
    const validBody = {
      title: "Fix bug",
      columnId: fakeId(1),
    };

    it("should pass with minimal valid data (title + columnId)", async () => {
      const result = await createTaskSchema.parseAsync({ body: validBody });
      expect(result.body.title).toBe("Fix bug");
      expect(result.body.priority).toBe("medium"); // default
    });

    it("should pass with all optional fields provided", async () => {
      const result = await createTaskSchema.parseAsync({
        body: {
          ...validBody,
          description: "Details here",
          priority: "high",
          label: "Bug",
          dueDate: "2026-12-31T00:00:00.000Z",
          assignedTo: fakeId(2),
        },
      });
      expect(result.body.priority).toBe("high");
      expect(result.body.label).toBe("Bug");
    });

    it("should accept null for assignedTo and label", async () => {
      const result = await createTaskSchema.parseAsync({
        body: { ...validBody, assignedTo: null, label: null },
      });
      expect(result.body.assignedTo).toBeNull();
      expect(result.body.label).toBeNull();
    });

    it("should reject when title is missing", async () => {
      await expect(
        createTaskSchema.parseAsync({ body: { columnId: fakeId(1) } })
      ).rejects.toThrow();
    });

    it("should reject when title is empty string", async () => {
      await expect(
        createTaskSchema.parseAsync({ body: { title: "", columnId: fakeId(1) } })
      ).rejects.toThrow(/title/i);
    });

    it("should reject when columnId is invalid format", async () => {
      await expect(
        createTaskSchema.parseAsync({ body: { title: "Task", columnId: "bad" } })
      ).rejects.toThrow(/Invalid Column ID/i);
    });

    it("should reject invalid priority value", async () => {
      await expect(
        createTaskSchema.parseAsync({ body: { title: "Task", columnId: fakeId(1), priority: "urgent" } })
      ).rejects.toThrow();
    });

    it("should reject invalid label value", async () => {
      await expect(
        createTaskSchema.parseAsync({ body: { title: "Task", columnId: fakeId(1), label: "InvalidLabel" } })
      ).rejects.toThrow();
    });

    it("should reject invalid assignedTo format", async () => {
      await expect(
        createTaskSchema.parseAsync({ body: { title: "Task", columnId: fakeId(1), assignedTo: "not-id" } })
      ).rejects.toThrow(/Invalid User ID/i);
    });

    it("should accept all valid label values", async () => {
      const labels = ["Bug", "Frontend", "Backend", "Documentation", "DevOps", "Design", "Testing", "Feature", "Other"];
      for (const label of labels) {
        const result = await createTaskSchema.parseAsync({ body: { ...validBody, label } });
        expect(result.body.label).toBe(label);
      }
    });
  });

  // ═══════════════════════════════════════
  // updateTaskSchema
  // ═══════════════════════════════════════
  describe("updateTaskSchema", () => {
    it("should pass with partial update (title only)", async () => {
      const result = await updateTaskSchema.parseAsync({ body: { title: "New title" } });
      expect(result.body.title).toBe("New title");
    });

    it("should pass with empty body (all fields optional)", async () => {
      const result = await updateTaskSchema.parseAsync({ body: {} });
      expect(result.body).toBeDefined();
    });

    it("should reject invalid priority", async () => {
      await expect(
        updateTaskSchema.parseAsync({ body: { priority: "critical" } })
      ).rejects.toThrow();
    });

    it("should accept null for assignedTo", async () => {
      const result = await updateTaskSchema.parseAsync({ body: { assignedTo: null } });
      expect(result.body.assignedTo).toBeNull();
    });

    it("should reject empty title string", async () => {
      await expect(
        updateTaskSchema.parseAsync({ body: { title: "" } })
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════
  // moveTaskSchema
  // ═══════════════════════════════════════
  describe("moveTaskSchema", () => {
    const validBody = {
      taskId: fakeId(1),
      sourceColumnId: fakeId(2),
      destinationColumnId: fakeId(3),
    };

    it("should pass with valid move data", async () => {
      const result = await moveTaskSchema.parseAsync({ body: validBody });
      expect(result.body.taskId).toBe(fakeId(1));
    });

    it("should reject when taskId is missing", async () => {
      await expect(
        moveTaskSchema.parseAsync({ body: { sourceColumnId: fakeId(1), destinationColumnId: fakeId(2) } })
      ).rejects.toThrow();
    });

    it("should reject invalid taskId format", async () => {
      await expect(
        moveTaskSchema.parseAsync({ body: { ...validBody, taskId: "bad" } })
      ).rejects.toThrow(/Invalid Task ID/i);
    });

    it("should reject invalid sourceColumnId format", async () => {
      await expect(
        moveTaskSchema.parseAsync({ body: { ...validBody, sourceColumnId: "bad" } })
      ).rejects.toThrow(/Invalid Source Column ID/i);
    });

    it("should reject invalid destinationColumnId format", async () => {
      await expect(
        moveTaskSchema.parseAsync({ body: { ...validBody, destinationColumnId: "bad" } })
      ).rejects.toThrow(/Invalid Destination Column ID/i);
    });
  });

  // ═══════════════════════════════════════
  // reorderTaskSchema
  // ═══════════════════════════════════════
  describe("reorderTaskSchema", () => {
    it("should pass with valid taskIds array and columnId param", async () => {
      const result = await reorderTaskSchema.parseAsync({
        body: { taskIds: [fakeId(1), fakeId(2)] },
        params: { columnId: fakeId(3) },
      });
      expect(result.body.taskIds).toHaveLength(2);
    });

    it("should reject invalid taskIds format", async () => {
      await expect(
        reorderTaskSchema.parseAsync({
          body: { taskIds: ["bad"] },
          params: { columnId: fakeId(1) },
        })
      ).rejects.toThrow(/Invalid Task ID/i);
    });

    it("should reject invalid columnId param", async () => {
      await expect(
        reorderTaskSchema.parseAsync({
          body: { taskIds: [fakeId(1)] },
          params: { columnId: "bad" },
        })
      ).rejects.toThrow(/Invalid Column ID/i);
    });
  });

  // ═══════════════════════════════════════
  // getTasksQuerySchema
  // ═══════════════════════════════════════
  describe("getTasksQuerySchema", () => {
    it("should pass with only boardId", async () => {
      const result = await getTasksQuerySchema.parseAsync({ query: { boardId: fakeId(1) } });
      expect(result.query.boardId).toBe(fakeId(1));
    });

    it("should pass with all optional filters", async () => {
      const result = await getTasksQuerySchema.parseAsync({
        query: {
          boardId: fakeId(1),
          columnId: fakeId(2),
          assignedTo: fakeId(3),
          priority: "high",
          search: "bug",
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-12-31T00:00:00.000Z",
        },
      });
      expect(result.query.priority).toBe("high");
    });

    it("should reject when boardId is missing", async () => {
      await expect(
        getTasksQuerySchema.parseAsync({ query: {} })
      ).rejects.toThrow();
    });

    it("should reject invalid priority filter", async () => {
      await expect(
        getTasksQuerySchema.parseAsync({ query: { boardId: fakeId(1), priority: "urgent" } })
      ).rejects.toThrow();
    });
  });
});
