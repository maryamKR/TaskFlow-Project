const { createBoard, getBoards, getBoardById, deleteBoard, reorderColumns } = require("../../controllers/boardController");
const Board = require("../../models/Board");
const Column = require("../../models/Column");
const Task = require("../../models/Task");
const Comment = require("../../models/Comment");
const Notification = require("../../models/Notification");
const { hasBoardAccess } = require("../../utils/boardAuth");
const { notifyOwner } = require("../../utils/notifyOwner");
const { getIO } = require("../../socket");
const { mockReq, mockRes, fakeId } = require("../helpers");

jest.mock("../../models/Board");
jest.mock("../../models/Column");
jest.mock("../../models/Task");
jest.mock("../../models/Comment");
jest.mock("../../models/Notification");
jest.mock("../../utils/boardAuth");
jest.mock("../../utils/notifyOwner");
jest.mock("../../socket");

const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });

beforeEach(() => {
  getIO.mockReturnValue({ to: mockTo });
  notifyOwner.mockResolvedValue(undefined);
});

describe("boardController", () => {
  // ═══════════════════════════════════════
  // createBoard
  // ═══════════════════════════════════════
  describe("createBoard", () => {
    it("should create a board with 4 default columns (201)", async () => {
      const req = mockReq({ body: { title: "My Board" } });
      const res = mockRes();

      const mockBoard = {
        _id: fakeId(1),
        title: "My Board",
        columns: [],
        save: jest.fn(),
      };
      Board.create.mockResolvedValue(mockBoard);

      const mockColumns = [
        { _id: fakeId(10) }, { _id: fakeId(11) }, { _id: fakeId(12) }, { _id: fakeId(13) },
      ];
      Column.insertMany.mockResolvedValue(mockColumns);
      Board.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue({ ...mockBoard, columns: mockColumns }) });

      await createBoard(req, res);

      expect(Column.insertMany).toHaveBeenCalled();
      const insertArg = Column.insertMany.mock.calls[0][0];
      expect(insertArg).toHaveLength(4);
      expect(insertArg.map((c) => c.title)).toEqual(["To Do", "In Progress", "Review", "Done"]);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ═══════════════════════════════════════
  // getBoards
  // ═══════════════════════════════════════
  describe("getBoards", () => {
    it("should return boards for the user (owned + coworker)", async () => {
      const req = mockReq();
      const res = mockRes();

      const boards = [{ _id: fakeId(1), title: "Board1" }];
      Board.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(boards) }),
      });

      await getBoards(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 1, data: boards }));
    });
  });

  // ═══════════════════════════════════════
  // getBoardById
  // ═══════════════════════════════════════
  describe("getBoardById", () => {
    it("should return a populated board when user has access", async () => {
      const req = mockReq({ params: { id: fakeId(1) } });
      const res = mockRes();

      const mockBoard = { _id: fakeId(1), user: fakeId(1), coworkers: [] };
      Board.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBoard),
        }),
      });
      hasBoardAccess.mockReturnValue(true);

      await getBoardById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockBoard });
    });

    it("should throw 404 when board not found", async () => {
      const req = mockReq({ params: { id: fakeId(1) } });
      const res = mockRes();

      Board.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(getBoardById(req, res)).rejects.toThrow("Board not found");
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should throw 403 when user has no access", async () => {
      const req = mockReq({ params: { id: fakeId(1) } });
      const res = mockRes();

      const mockBoard = { _id: fakeId(1), user: fakeId(9), coworkers: [] };
      Board.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBoard),
        }),
      });
      hasBoardAccess.mockReturnValue(false);

      await expect(getBoardById(req, res)).rejects.toThrow("You do not have permission to view this board");
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ═══════════════════════════════════════
  // deleteBoard
  // ═══════════════════════════════════════
  describe("deleteBoard", () => {
    it("should cascade delete board, columns, tasks, comments, notifications", async () => {
      const userId = fakeId(1);
      const req = mockReq({ params: { id: fakeId(1) }, user: { _id: userId } });
      const res = mockRes();

      const mockBoard = {
        _id: fakeId(1),
        user: userId,
        columns: [fakeId(10), fakeId(11)],
        deleteOne: jest.fn(),
      };
      Board.findById.mockResolvedValue(mockBoard);
      Task.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: fakeId(20) }]) });
      Comment.deleteMany.mockResolvedValue({});
      Notification.deleteMany.mockResolvedValue({});
      Task.deleteMany.mockResolvedValue({});
      Column.deleteMany.mockResolvedValue({});

      await deleteBoard(req, res);

      expect(Comment.deleteMany).toHaveBeenCalled();
      expect(Notification.deleteMany).toHaveBeenCalled();
      expect(Task.deleteMany).toHaveBeenCalled();
      expect(Column.deleteMany).toHaveBeenCalled();
      expect(mockBoard.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should throw 404 when board not found", async () => {
      const req = mockReq({ params: { id: fakeId(1) } });
      const res = mockRes();

      Board.findById.mockResolvedValue(null);

      await expect(deleteBoard(req, res)).rejects.toThrow("Board not found");
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should throw 403 when non-owner tries to delete", async () => {
      const req = mockReq({ params: { id: fakeId(1) }, user: { _id: fakeId(9) } });
      const res = mockRes();

      Board.findById.mockResolvedValue({ _id: fakeId(1), user: fakeId(1) });

      await expect(deleteBoard(req, res)).rejects.toThrow("Only the owner can delete this board");
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ═══════════════════════════════════════
  // reorderColumns
  // ═══════════════════════════════════════
  describe("reorderColumns", () => {
    it("should reorder columns successfully", async () => {
      const colIds = [fakeId(10), fakeId(11)];
      const req = mockReq({ params: { boardId: fakeId(1) }, body: { columnIds: [...colIds].reverse() } });
      const res = mockRes();

      const mockBoard = {
        _id: fakeId(1),
        columns: colIds.map((id) => ({ toString: () => id })),
        save: jest.fn(),
      };
      Board.findById.mockResolvedValue(mockBoard);
      hasBoardAccess.mockReturnValue(true);

      await reorderColumns(req, res);

      expect(mockBoard.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should throw 404 when board not found", async () => {
      const req = mockReq({ params: { boardId: fakeId(1) }, body: { columnIds: [] } });
      const res = mockRes();
      Board.findById.mockResolvedValue(null);

      await expect(reorderColumns(req, res)).rejects.toThrow("Board not found");
    });

    it("should throw 403 when user has no access", async () => {
      const req = mockReq({ params: { boardId: fakeId(1) }, body: { columnIds: [] } });
      const res = mockRes();
      Board.findById.mockResolvedValue({ _id: fakeId(1), columns: [] });
      hasBoardAccess.mockReturnValue(false);

      await expect(reorderColumns(req, res)).rejects.toThrow("Not authorized to modify this board");
    });

    it("should throw 400 when column count mismatches", async () => {
      const req = mockReq({ params: { boardId: fakeId(1) }, body: { columnIds: [fakeId(10)] } });
      const res = mockRes();
      Board.findById.mockResolvedValue({ _id: fakeId(1), columns: [fakeId(10), fakeId(11)] });
      hasBoardAccess.mockReturnValue(true);

      await expect(reorderColumns(req, res)).rejects.toThrow("Mismatched column count");
    });

    it("should throw 400 when column IDs don't belong to the board", async () => {
      const req = mockReq({
        params: { boardId: fakeId(1) },
        body: { columnIds: [fakeId(99)] },
      });
      const res = mockRes();
      Board.findById.mockResolvedValue({
        _id: fakeId(1),
        columns: [{ toString: () => fakeId(10) }],
      });
      hasBoardAccess.mockReturnValue(true);

      await expect(reorderColumns(req, res)).rejects.toThrow("Column IDs do not match the board's columns");
    });
  });
});
