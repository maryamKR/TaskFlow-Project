const { addComment, getComments, deleteComment } = require("../../controllers/commentController");
const Comment = require("../../models/Comment");
const Task = require("../../models/Task");
const { getTaskWithBoardAccess } = require("../../utils/taskHelpers");
const notifyAndEmit = require("../../utils/notifyAndEmit");
const { notifyOwner } = require("../../utils/notifyOwner");
const { getIO } = require("../../socket");
const { mockReq, mockRes, fakeId } = require("../helpers");

jest.mock("../../models/Comment");
jest.mock("../../models/Task");
jest.mock("../../utils/taskHelpers");
jest.mock("../../utils/notifyAndEmit");
jest.mock("../../utils/notifyOwner");
jest.mock("../../socket");

const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });

beforeEach(() => {
  getIO.mockReturnValue({ to: mockTo });
  notifyAndEmit.mockResolvedValue({});
  notifyOwner.mockResolvedValue(undefined);
});

describe("commentController", () => {
  // ═══════════════════════════════════════
  // addComment
  // ═══════════════════════════════════════
  describe("addComment", () => {
    it("should create a comment and notify assignee/creator (201)", async () => {
      const userId = fakeId(1);
      const assigneeId = fakeId(2);
      const creatorId = fakeId(3);
      const req = mockReq({
        params: { taskId: fakeId(20) },
        body: { content: "Looks good!" },
        user: { _id: userId, username: "testuser" },
      });
      const res = mockRes();

      const mockTask = {
        _id: fakeId(20),
        title: "Task",
        assignedTo: { _id: assigneeId },
        createdBy: creatorId,
        comments: [],
        activityLog: [],
        save: jest.fn(),
        populate: jest.fn().mockResolvedValue(undefined),
      };
      const mockBoard = { _id: fakeId(1), user: fakeId(9) };
      getTaskWithBoardAccess.mockResolvedValue({ task: mockTask, board: mockBoard });

      const mockComment = {
        _id: fakeId(30),
        content: "Looks good!",
        populate: jest.fn().mockResolvedValue(undefined),
      };
      Comment.create.mockResolvedValue(mockComment);

      await addComment(req, res);

      expect(Comment.create).toHaveBeenCalledWith({
        content: "Looks good!",
        task: fakeId(20),
        author: userId,
      });
      expect(mockTask.save).toHaveBeenCalled();
      // Should notify both assignee and creator (not the commenter)
      expect(notifyAndEmit).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should NOT notify the commenter even if they are the assignee", async () => {
      const userId = fakeId(1);
      const req = mockReq({
        params: { taskId: fakeId(20) },
        body: { content: "My comment" },
        user: { _id: userId, username: "testuser" },
      });
      const res = mockRes();

      const mockTask = {
        _id: fakeId(20),
        title: "Task",
        assignedTo: { _id: userId }, // commenter IS the assignee
        createdBy: userId,           // commenter IS also the creator
        comments: [],
        activityLog: [],
        save: jest.fn(),
        populate: jest.fn().mockResolvedValue(undefined),
      };
      getTaskWithBoardAccess.mockResolvedValue({ task: mockTask, board: { _id: fakeId(1), user: fakeId(9) } });
      Comment.create.mockResolvedValue({ _id: fakeId(30), populate: jest.fn().mockResolvedValue(undefined) });

      await addComment(req, res);

      // Should NOT call notifyAndEmit since both recipients === commenter
      expect(notifyAndEmit).not.toHaveBeenCalled();
    });

    it("should propagate access errors from getTaskWithBoardAccess", async () => {
      const req = mockReq({ params: { taskId: fakeId(20) }, body: { content: "x" } });
      const res = mockRes();
      const err = new Error("Not authorized to view this task");
      err.statusCode = 403;
      getTaskWithBoardAccess.mockRejectedValue(err);

      await expect(addComment(req, res)).rejects.toThrow("Not authorized");
    });
  });

  // ═══════════════════════════════════════
  // getComments
  // ═══════════════════════════════════════
  describe("getComments", () => {
    it("should return comments sorted by newest first", async () => {
      const req = mockReq({ params: { taskId: fakeId(20) } });
      const res = mockRes();

      getTaskWithBoardAccess.mockResolvedValue({});
      const comments = [{ _id: fakeId(30), content: "Hello" }];
      Comment.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(comments),
        }),
      });

      await getComments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: comments });
    });

    it("should propagate access errors", async () => {
      const req = mockReq({ params: { taskId: fakeId(20) } });
      const res = mockRes();
      getTaskWithBoardAccess.mockRejectedValue(new Error("Task not found"));

      await expect(getComments(req, res)).rejects.toThrow("Task not found");
    });
  });

  // ═══════════════════════════════════════
  // deleteComment
  // ═══════════════════════════════════════
  describe("deleteComment", () => {
    it("should allow comment author to delete their comment", async () => {
      const userId = fakeId(1);
      const req = mockReq({ params: { commentId: fakeId(30) }, user: { _id: userId } });
      const res = mockRes();

      const mockComment = {
        _id: fakeId(30),
        author: userId,
        task: fakeId(20),
        deleteOne: jest.fn(),
      };
      Comment.findById.mockResolvedValue(mockComment);
      getTaskWithBoardAccess.mockResolvedValue({ board: { _id: fakeId(1), user: fakeId(9) } });
      Task.findByIdAndUpdate.mockResolvedValue({});

      await deleteComment(req, res);

      expect(mockComment.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should allow board owner to delete any comment", async () => {
      const ownerId = fakeId(9);
      const req = mockReq({ params: { commentId: fakeId(30) }, user: { _id: ownerId } });
      const res = mockRes();

      const mockComment = {
        _id: fakeId(30),
        author: fakeId(1), // different from ownerId
        task: fakeId(20),
        deleteOne: jest.fn(),
      };
      Comment.findById.mockResolvedValue(mockComment);
      getTaskWithBoardAccess.mockResolvedValue({ board: { _id: fakeId(1), user: ownerId } });
      Task.findByIdAndUpdate.mockResolvedValue({});

      await deleteComment(req, res);

      expect(mockComment.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should throw 404 when comment not found", async () => {
      const req = mockReq({ params: { commentId: fakeId(30) } });
      const res = mockRes();
      Comment.findById.mockResolvedValue(null);

      await expect(deleteComment(req, res)).rejects.toThrow("Comment not found");
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should throw 403 when non-author non-owner tries to delete", async () => {
      const strangerId = fakeId(8);
      const req = mockReq({ params: { commentId: fakeId(30) }, user: { _id: strangerId } });
      const res = mockRes();

      Comment.findById.mockResolvedValue({
        _id: fakeId(30),
        author: fakeId(1),
        task: fakeId(20),
      });
      getTaskWithBoardAccess.mockResolvedValue({ board: { _id: fakeId(1), user: fakeId(9) } });

      await expect(deleteComment(req, res)).rejects.toThrow("not authorized to delete");
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
