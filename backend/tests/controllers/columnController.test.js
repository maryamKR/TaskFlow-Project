const { createColumn, getColumnsByBoard, updateColumn, deleteColumn } = require("../../controllers/columnController");
const Column = require("../../models/Column");
const Board = require("../../models/Board");
const Task = require("../../models/Task");
const Comment = require("../../models/Comment");
const Notification = require("../../models/Notification");
const { hasBoardAccess } = require("../../utils/boardAuth");
const { notifyOwner } = require("../../utils/notifyOwner");
const { getIO } = require("../../socket");
const { mockReq, mockRes, fakeId } = require("../helpers");

jest.mock("../../models/Column");
jest.mock("../../models/Board");
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

describe("columnController", () => {
  // ═══════════════════════════════════════
  // createColumn
  // ═══════════════════════════════════════
  describe("createColumn", () => {
    it("should create column and add to board (201)", async () => {
      const boardId = fakeId(1);
      const req = mockReq({ body: { title: "New Column", boardId } });
      const res = mockRes();

      const mockBoard = { _id: boardId, columns: [], save: jest.fn() };
      mockBoard.columns.push = jest.fn();
      Board.findById.mockResolvedValue(mockBoard);
      hasBoardAccess.mockReturnValue(true);

      const mockColumn = { _id: fakeId(10), title: "New Column", board: boardId };
      Column.create.mockResolvedValue(mockColumn);

      await createColumn(req, res);

      expect(Column.create).toHaveBeenCalledWith({ title: "New Column", board: boardId });
      expect(mockBoard.columns.push).toHaveBeenCalledWith(mockColumn._id);
      expect(mockBoard.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should throw 404 when board not found", async () => {
      const req = mockReq({ body: { title: "Col", boardId: fakeId(1) } });
      const res = mockRes();
      Board.findById.mockResolvedValue(null);

      await expect(createColumn(req, res)).rejects.toThrow("Board not found");
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should throw 403 when user has no board access", async () => {
      const req = mockReq({ body: { title: "Col", boardId: fakeId(1) } });
      const res = mockRes();
      Board.findById.mockResolvedValue({ _id: fakeId(1) });
      hasBoardAccess.mockReturnValue(false);

      await expect(createColumn(req, res)).rejects.toThrow("Not authorized");
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ═══════════════════════════════════════
  // getColumnsByBoard
  // ═══════════════════════════════════════
  describe("getColumnsByBoard", () => {
    it("should return columns sorted by position", async () => {
      const req = mockReq({ params: { boardId: fakeId(1) } });
      const res = mockRes();

      Board.findById.mockResolvedValue({ _id: fakeId(1) });
      hasBoardAccess.mockReturnValue(true);

      const columns = [{ _id: fakeId(10), title: "Col1", position: 0 }];
      Column.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(columns) });

      await getColumnsByBoard(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: columns });
    });

    it("should throw 404 when board not found", async () => {
      const req = mockReq({ params: { boardId: fakeId(1) } });
      const res = mockRes();
      Board.findById.mockResolvedValue(null);

      await expect(getColumnsByBoard(req, res)).rejects.toThrow("Board not found");
    });

    it("should throw 403 when user has no access", async () => {
      const req = mockReq({ params: { boardId: fakeId(1) } });
      const res = mockRes();
      Board.findById.mockResolvedValue({ _id: fakeId(1) });
      hasBoardAccess.mockReturnValue(false);

      await expect(getColumnsByBoard(req, res)).rejects.toThrow("Not authorized");
    });
  });

  // ═══════════════════════════════════════
  // updateColumn
  // ═══════════════════════════════════════
  describe("updateColumn", () => {
    it("should update column title", async () => {
      const req = mockReq({ params: { id: fakeId(10) }, body: { title: "Renamed" } });
      const res = mockRes();

      Column.findById.mockResolvedValue({ _id: fakeId(10), board: fakeId(1) });
      Board.findById.mockResolvedValue({ _id: fakeId(1) });
      hasBoardAccess.mockReturnValue(true);

      const updatedCol = { _id: fakeId(10), title: "Renamed" };
      Column.findByIdAndUpdate.mockResolvedValue(updatedCol);

      await updateColumn(req, res);

      expect(Column.findByIdAndUpdate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should throw 404 when column not found", async () => {
      const req = mockReq({ params: { id: fakeId(10) }, body: { title: "X" } });
      const res = mockRes();
      Column.findById.mockResolvedValue(null);

      await expect(updateColumn(req, res)).rejects.toThrow("Column not found");
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should throw 403 when user has no access", async () => {
      const req = mockReq({ params: { id: fakeId(10) }, body: { title: "X" } });
      const res = mockRes();
      Column.findById.mockResolvedValue({ _id: fakeId(10), board: fakeId(1) });
      Board.findById.mockResolvedValue(null);

      await expect(updateColumn(req, res)).rejects.toThrow("Not authorized");
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ═══════════════════════════════════════
  // deleteColumn
  // ═══════════════════════════════════════
  describe("deleteColumn", () => {
    it("should cascade delete column, tasks, comments, notifications", async () => {
      const ownerId = fakeId(1);
      const req = mockReq({ params: { id: fakeId(10) }, user: { _id: ownerId } });
      const res = mockRes();

      const mockColumn = {
        _id: fakeId(10),
        board: fakeId(1),
        tasks: [fakeId(20)],
        deleteOne: jest.fn(),
      };
      Column.findById.mockResolvedValue(mockColumn);
      Board.findById.mockResolvedValue({ _id: fakeId(1), user: ownerId });
      Board.findByIdAndUpdate.mockResolvedValue({});
      Comment.deleteMany.mockResolvedValue({});
      Notification.deleteMany.mockResolvedValue({});
      Task.deleteMany.mockResolvedValue({});

      await deleteColumn(req, res);

      expect(mockColumn.deleteOne).toHaveBeenCalled();
      expect(Board.findByIdAndUpdate).toHaveBeenCalledWith(fakeId(1), { $pull: { columns: mockColumn._id } });
      expect(Comment.deleteMany).toHaveBeenCalled();
      expect(Notification.deleteMany).toHaveBeenCalled();
      expect(Task.deleteMany).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should throw 403 when non-owner tries to delete", async () => {
      const req = mockReq({ params: { id: fakeId(10) }, user: { _id: fakeId(9) } });
      const res = mockRes();

      Column.findById.mockResolvedValue({ _id: fakeId(10), board: fakeId(1) });
      Board.findById.mockResolvedValue({ _id: fakeId(1), user: fakeId(1) });

      await expect(deleteColumn(req, res)).rejects.toThrow("Only the board owner can delete columns");
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
