const {
  createTask, getTask, updateTask, deleteTask,
  moveTask, reorderTask, getTasks, getTaskActivity,
} = require("../../controllers/taskController");
const Task = require("../../models/Task");
const Column = require("../../models/Column");
const Board = require("../../models/Board");
const Comment = require("../../models/Comment");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const { hasBoardAccess } = require("../../utils/boardAuth");
const notifyAndEmit = require("../../utils/notifyAndEmit");
const { getTaskWithBoardAccess } = require("../../utils/taskHelpers");
const { notifyOwner } = require("../../utils/notifyOwner");
const { getIO } = require("../../socket");
const { mockReq, mockRes, fakeId } = require("../helpers");

jest.mock("../../models/Task");
jest.mock("../../models/Column");
jest.mock("../../models/Board");
jest.mock("../../models/Comment");
jest.mock("../../models/User");
jest.mock("../../models/Notification");
jest.mock("../../utils/boardAuth");
jest.mock("../../utils/notifyAndEmit");
jest.mock("../../utils/taskHelpers");
jest.mock("../../utils/notifyOwner");
jest.mock("../../socket");

const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });

beforeEach(() => {
  getIO.mockReturnValue({ to: mockTo });
  notifyAndEmit.mockResolvedValue({});
  notifyOwner.mockResolvedValue(undefined);
});

describe("taskController", () => {
  // ═══════════════════════════════════════
  // createTask
  // ═══════════════════════════════════════
  describe("createTask", () => {
    it("should create a task successfully (201)", async () => {
      const req = mockReq({
        body: { title: "Fix bug", columnId: fakeId(10) },
      });
      const res = mockRes();

      Column.findById.mockResolvedValue({ _id: fakeId(10), title: "To Do", board: fakeId(1), tasks: [], save: jest.fn() });
      Board.findById.mockResolvedValue({ _id: fakeId(1), user: fakeId(1), coworkers: [] });
      hasBoardAccess.mockReturnValue(true);

      const mockTask = {
        _id: fakeId(20),
        title: "Fix bug",
        assignedTo: null,
        createdBy: fakeId(1),
        populate: jest.fn().mockResolvedValue(undefined),
      };
      Task.create.mockResolvedValue(mockTask);

      await createTask(req, res);

      expect(Task.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should throw 400 when creating task in Done column", async () => {
      const req = mockReq({ body: { title: "Task", columnId: fakeId(10) } });
      const res = mockRes();

      Column.findById.mockResolvedValue({ _id: fakeId(10), title: "Done", board: fakeId(1) });

      await expect(createTask(req, res)).rejects.toThrow("cannot be created directly in the Done column");
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should throw 404 when column not found", async () => {
      const req = mockReq({ body: { title: "Task", columnId: fakeId(10) } });
      const res = mockRes();
      Column.findById.mockResolvedValue(null);

      await expect(createTask(req, res)).rejects.toThrow("Column not found");
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should throw 404 when associated board not found", async () => {
      const req = mockReq({ body: { title: "Task", columnId: fakeId(10) } });
      const res = mockRes();
      Column.findById.mockResolvedValue({ _id: fakeId(10), title: "To Do", board: fakeId(1) });
      Board.findById.mockResolvedValue(null);

      await expect(createTask(req, res)).rejects.toThrow("Associated board not found");
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should throw 403 when user has no board access", async () => {
      const req = mockReq({ body: { title: "Task", columnId: fakeId(10) } });
      const res = mockRes();
      Column.findById.mockResolvedValue({ _id: fakeId(10), title: "To Do", board: fakeId(1) });
      Board.findById.mockResolvedValue({ _id: fakeId(1) });
      hasBoardAccess.mockReturnValue(false);

      await expect(createTask(req, res)).rejects.toThrow("Not authorized");
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("should throw 400 when assignee is not a board member", async () => {
      const req = mockReq({
        body: { title: "Task", columnId: fakeId(10), assignedTo: fakeId(9) },
      });
      const res = mockRes();
      Column.findById.mockResolvedValue({ _id: fakeId(10), title: "To Do", board: fakeId(1) });
      Board.findById.mockResolvedValue({ _id: fakeId(1) });
      hasBoardAccess
        .mockReturnValueOnce(true)   // user access check
        .mockReturnValueOnce(false); // assignee access check

      await expect(createTask(req, res)).rejects.toThrow("Assigned user must be a member");
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ═══════════════════════════════════════
  // getTask
  // ═══════════════════════════════════════
  describe("getTask", () => {
    it("should return a populated task", async () => {
      const req = mockReq({ params: { id: fakeId(20) } });
      const res = mockRes();

      const mockTask = {
        _id: fakeId(20),
        title: "Task",
        populate: jest.fn().mockResolvedValue(undefined),
      };
      getTaskWithBoardAccess.mockResolvedValue({ task: mockTask });

      await getTask(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockTask });
    });

    it("should propagate error from getTaskWithBoardAccess (e.g., 404)", async () => {
      const req = mockReq({ params: { id: fakeId(20) } });
      const res = mockRes();
      const err = new Error("Task not found");
      err.statusCode = 404;
      getTaskWithBoardAccess.mockRejectedValue(err);

      await expect(getTask(req, res)).rejects.toThrow("Task not found");
    });
  });

  // ═══════════════════════════════════════
  // deleteTask
  // ═══════════════════════════════════════
  describe("deleteTask", () => {
    it("should cascade delete task, comments, notifications", async () => {
      const ownerId = fakeId(1);
      const req = mockReq({ params: { id: fakeId(20) }, user: { _id: ownerId } });
      const res = mockRes();

      const mockTask = { _id: fakeId(20), deleteOne: jest.fn() };
      Task.findById.mockResolvedValue(mockTask);

      const mockColumn = { _id: fakeId(10), board: fakeId(1), tasks: { pull: jest.fn() }, save: jest.fn() };
      Column.findOne.mockResolvedValue(mockColumn);
      Board.findById.mockResolvedValue({ _id: fakeId(1), user: { _id: ownerId } });
      Comment.deleteMany.mockResolvedValue({});
      Notification.deleteMany.mockResolvedValue({});

      await deleteTask(req, res);

      expect(Comment.deleteMany).toHaveBeenCalled();
      expect(Notification.deleteMany).toHaveBeenCalled();
      expect(mockTask.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should throw 404 when task not found", async () => {
      const req = mockReq({ params: { id: fakeId(20) } });
      const res = mockRes();
      Task.findById.mockResolvedValue(null);

      await expect(deleteTask(req, res)).rejects.toThrow("Task not found");
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should throw 403 when non-owner tries to delete", async () => {
      const req = mockReq({ params: { id: fakeId(20) }, user: { _id: fakeId(9) } });
      const res = mockRes();

      Task.findById.mockResolvedValue({ _id: fakeId(20) });
      Column.findOne.mockResolvedValue({ board: fakeId(1), tasks: { pull: jest.fn() } });
      Board.findById.mockResolvedValue({ _id: fakeId(1), user: fakeId(1) });

      await expect(deleteTask(req, res)).rejects.toThrow("Only the board owner can delete");
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ═══════════════════════════════════════
  // moveTask
  // ═══════════════════════════════════════
  describe("moveTask", () => {
    it("should move task between columns successfully", async () => {
      const req = mockReq({
        body: { taskId: fakeId(20), sourceColumnId: fakeId(10), destinationColumnId: fakeId(11) },
      });
      const res = mockRes();

      Column.findById
        .mockResolvedValueOnce({ _id: fakeId(10), board: fakeId(1) }) // source
        .mockResolvedValueOnce({ _id: fakeId(11), board: fakeId(1), title: "In Progress" }); // dest
      Board.findById
        .mockResolvedValueOnce({ _id: fakeId(1) })
        .mockResolvedValueOnce({ _id: fakeId(1), user: fakeId(1) });
      hasBoardAccess.mockReturnValue(true);
      Task.findById.mockResolvedValue({ _id: fakeId(20), title: "Task", column: fakeId(10), assignedTo: null });
      Column.findByIdAndUpdate.mockResolvedValue({});
      Task.findByIdAndUpdate.mockResolvedValue({});

      await moveTask(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 200 no-op when source === destination", async () => {
      const req = mockReq({
        body: { taskId: fakeId(20), sourceColumnId: fakeId(10), destinationColumnId: fakeId(10) },
      });
      const res = mockRes();

      await moveTask(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: "No move needed" });
    });

    it("should throw 400 when required fields are missing", async () => {
      const req = mockReq({ body: { taskId: fakeId(20) } });
      const res = mockRes();

      await expect(moveTask(req, res)).rejects.toThrow("Missing required fields");
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should throw 404 when source column not found", async () => {
      const req = mockReq({
        body: { taskId: fakeId(20), sourceColumnId: fakeId(10), destinationColumnId: fakeId(11) },
      });
      const res = mockRes();
      Column.findById.mockResolvedValueOnce(null);

      await expect(moveTask(req, res)).rejects.toThrow("Source column not found");
    });

    it("should throw 404 when destination column not found", async () => {
      const req = mockReq({
        body: { taskId: fakeId(20), sourceColumnId: fakeId(10), destinationColumnId: fakeId(11) },
      });
      const res = mockRes();
      Column.findById
        .mockResolvedValueOnce({ _id: fakeId(10), board: fakeId(1) })
        .mockResolvedValueOnce(null);
      Board.findById.mockResolvedValue({ _id: fakeId(1) });
      hasBoardAccess.mockReturnValue(true);

      await expect(moveTask(req, res)).rejects.toThrow("Destination column not found");
    });

    it("should throw 400 when task does not belong to source column", async () => {
      const req = mockReq({
        body: { taskId: fakeId(20), sourceColumnId: fakeId(10), destinationColumnId: fakeId(11) },
      });
      const res = mockRes();
      Column.findById
        .mockResolvedValueOnce({ _id: fakeId(10), board: fakeId(1) })
        .mockResolvedValueOnce({ _id: fakeId(11), board: fakeId(1), title: "Review" });
      Board.findById.mockResolvedValue({ _id: fakeId(1) });
      hasBoardAccess.mockReturnValue(true);
      Task.findById.mockResolvedValue({ _id: fakeId(20), column: { toString: () => fakeId(99) } });

      await expect(moveTask(req, res)).rejects.toThrow("does not belong to the source column");
    });
  });

  // ═══════════════════════════════════════
  // reorderTask
  // ═══════════════════════════════════════
  describe("reorderTask", () => {
    it("should reorder tasks within a column", async () => {
      const taskIds = [fakeId(20), fakeId(21)];
      const req = mockReq({ params: { columnId: fakeId(10) }, body: { taskIds } });
      const res = mockRes();

      const mockColumn = {
        _id: fakeId(10),
        board: fakeId(1),
        tasks: taskIds.map((id) => ({ toString: () => id })),
      };
      Column.findById.mockResolvedValue(mockColumn);
      Board.findById.mockResolvedValue({ _id: fakeId(1) });
      hasBoardAccess.mockReturnValue(true);
      Column.findByIdAndUpdate.mockResolvedValue({ tasks: taskIds });

      await reorderTask(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should throw 404 when column not found", async () => {
      const req = mockReq({ params: { columnId: fakeId(10) }, body: { taskIds: [] } });
      const res = mockRes();
      Column.findById.mockResolvedValue(null);

      await expect(reorderTask(req, res)).rejects.toThrow("Column not found");
    });

    it("should throw 403 when user has no access", async () => {
      const req = mockReq({ params: { columnId: fakeId(10) }, body: { taskIds: [] } });
      const res = mockRes();
      Column.findById.mockResolvedValue({ _id: fakeId(10), board: fakeId(1), tasks: [] });
      Board.findById.mockResolvedValue(null);

      await expect(reorderTask(req, res)).rejects.toThrow("Not authorized");
    });

    it("should throw 400 when task IDs don't match column tasks", async () => {
      const req = mockReq({ params: { columnId: fakeId(10) }, body: { taskIds: [fakeId(99)] } });
      const res = mockRes();
      Column.findById.mockResolvedValue({
        _id: fakeId(10),
        board: fakeId(1),
        tasks: [{ toString: () => fakeId(20) }],
      });
      Board.findById.mockResolvedValue({ _id: fakeId(1) });
      hasBoardAccess.mockReturnValue(true);

      await expect(reorderTask(req, res)).rejects.toThrow("do not match");
    });
  });

  // ═══════════════════════════════════════
  // getTasks
  // ═══════════════════════════════════════
  describe("getTasks", () => {
    it("should return filtered tasks", async () => {
      const req = mockReq({ query: { boardId: fakeId(1) } });
      const res = mockRes();

      Board.findById.mockResolvedValue({ _id: fakeId(1) });
      hasBoardAccess.mockReturnValue(true);
      Column.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: fakeId(10) }]) });

      const tasks = [{ _id: fakeId(20), title: "Task" }];
      Task.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(tasks),
        }),
      });

      await getTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
    });

    it("should throw 404 when board not found", async () => {
      const req = mockReq({ query: { boardId: fakeId(1) } });
      const res = mockRes();
      Board.findById.mockResolvedValue(null);

      await expect(getTasks(req, res)).rejects.toThrow("Board not found");
    });

    it("should throw 403 when user has no access", async () => {
      const req = mockReq({ query: { boardId: fakeId(1) } });
      const res = mockRes();
      Board.findById.mockResolvedValue({ _id: fakeId(1) });
      hasBoardAccess.mockReturnValue(false);

      await expect(getTasks(req, res)).rejects.toThrow("Not authorized");
    });
  });

  // ═══════════════════════════════════════
  // getTaskActivity
  // ═══════════════════════════════════════
  describe("getTaskActivity", () => {
    it("should return activity log", async () => {
      const req = mockReq({ params: { id: fakeId(20) } });
      const res = mockRes();

      const mockTask = {
        activityLog: [{ action: "Created" }],
        populate: jest.fn().mockResolvedValue(undefined),
      };
      getTaskWithBoardAccess.mockResolvedValue({ task: mockTask });

      await getTaskActivity(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockTask.activityLog });
    });

    it("should propagate access errors", async () => {
      const req = mockReq({ params: { id: fakeId(20) } });
      const res = mockRes();
      const err = new Error("Not authorized");
      err.statusCode = 403;
      getTaskWithBoardAccess.mockRejectedValue(err);

      await expect(getTaskActivity(req, res)).rejects.toThrow("Not authorized");
    });
  });
});
