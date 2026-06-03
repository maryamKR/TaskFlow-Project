const { getTaskWithBoardAccess } = require("../../utils/taskHelpers");
const Task = require("../../models/Task");
const Column = require("../../models/Column");
const Board = require("../../models/Board");
const { hasBoardAccess } = require("../../utils/boardAuth");
const { fakeId } = require("../helpers");

jest.mock("../../models/Task");
jest.mock("../../models/Column");
jest.mock("../../models/Board");
jest.mock("../../utils/boardAuth");

describe("getTaskWithBoardAccess", () => {
  const taskId = fakeId(1);
  const userId = fakeId(2);
  const columnId = fakeId(3);
  const boardId = fakeId(4);

  // ─── Happy path ───
  it("should return { task, column, board } when all lookups succeed and user has access", async () => {
    const mockTask = { _id: taskId, column: columnId };
    const mockColumn = { _id: columnId, board: boardId };
    const mockBoard = { _id: boardId, user: userId, coworkers: [] };

    Task.findById.mockResolvedValue(mockTask);
    Column.findById.mockResolvedValue(mockColumn);
    Board.findById.mockResolvedValue(mockBoard);
    hasBoardAccess.mockReturnValue(true);

    const result = await getTaskWithBoardAccess(taskId, userId);

    expect(result).toEqual({ task: mockTask, column: mockColumn, board: mockBoard });
    expect(Task.findById).toHaveBeenCalledWith(taskId);
    expect(Column.findById).toHaveBeenCalledWith(columnId);
    expect(Board.findById).toHaveBeenCalledWith(boardId);
    expect(hasBoardAccess).toHaveBeenCalledWith(mockBoard, userId);
  });

  // ─── Unhappy: task not found ───
  it("should throw 404 error when task is not found", async () => {
    Task.findById.mockResolvedValue(null);

    await expect(getTaskWithBoardAccess(taskId, userId)).rejects.toMatchObject({
      message: "Task not found",
      statusCode: 404,
    });
  });

  // ─── Unhappy: column not found ───
  it("should throw 404 error when column is not found", async () => {
    Task.findById.mockResolvedValue({ _id: taskId, column: columnId });
    Column.findById.mockResolvedValue(null);

    await expect(getTaskWithBoardAccess(taskId, userId)).rejects.toMatchObject({
      message: "Task not found in any column",
      statusCode: 404,
    });
  });

  // ─── Unhappy: board not found ───
  it("should throw 403 error when board is not found", async () => {
    Task.findById.mockResolvedValue({ _id: taskId, column: columnId });
    Column.findById.mockResolvedValue({ _id: columnId, board: boardId });
    Board.findById.mockResolvedValue(null);

    await expect(getTaskWithBoardAccess(taskId, userId)).rejects.toMatchObject({
      message: "Not authorized to view this task",
      statusCode: 403,
    });
  });

  // ─── Unhappy: user has no access to board ───
  it("should throw 403 error when user does not have board access", async () => {
    Task.findById.mockResolvedValue({ _id: taskId, column: columnId });
    Column.findById.mockResolvedValue({ _id: columnId, board: boardId });
    Board.findById.mockResolvedValue({ _id: boardId, user: fakeId(9), coworkers: [] });
    hasBoardAccess.mockReturnValue(false);

    await expect(getTaskWithBoardAccess(taskId, userId)).rejects.toMatchObject({
      message: "Not authorized to view this task",
      statusCode: 403,
    });
  });
});
