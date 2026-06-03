const { notifyOwner } = require("../../utils/notifyOwner");
const notifyAndEmit = require("../../utils/notifyAndEmit");
const { fakeId } = require("../helpers");

jest.mock("../../utils/notifyAndEmit");

describe("notifyOwner", () => {
  const ownerId = fakeId(1);
  const actorId = fakeId(2);
  const boardId = fakeId(3);

  const mockBoard = {
    _id: boardId,
    user: ownerId,
  };

  // ─── Happy path: actor is NOT the owner ───
  it("should call notifyAndEmit when the actor is not the board owner", async () => {
    notifyAndEmit.mockResolvedValue({});

    await notifyOwner(mockBoard, actorId, "Test message", "OWNER_ALERT", fakeId(5));

    expect(notifyAndEmit).toHaveBeenCalledWith({
      recipientId: ownerId,
      senderId: actorId,
      message: "Test message",
      type: "OWNER_ALERT",
      relatedId: fakeId(5),
      boardId: boardId.toString(),
    });
  });

  // ─── Happy path: board.user is populated object ───
  it("should extract ownerId from populated board.user._id", async () => {
    const populatedBoard = {
      _id: boardId,
      user: { _id: ownerId },
    };
    notifyAndEmit.mockResolvedValue({});

    await notifyOwner(populatedBoard, actorId, "msg", "OWNER_ALERT");

    expect(notifyAndEmit).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: ownerId })
    );
  });

  // ─── Skip: actor IS the owner ───
  it("should NOT notify when the actor is the board owner", async () => {
    await notifyOwner(mockBoard, ownerId, "msg", "OWNER_ALERT");

    expect(notifyAndEmit).not.toHaveBeenCalled();
  });

  // ─── Skip: board is null ───
  it("should NOT throw and NOT call notifyAndEmit when board is null", async () => {
    await expect(notifyOwner(null, actorId, "msg", "OWNER_ALERT")).resolves.toBeUndefined();
    expect(notifyAndEmit).not.toHaveBeenCalled();
  });

  // ─── Skip: board is undefined ───
  it("should NOT throw and NOT call notifyAndEmit when board is undefined", async () => {
    await expect(notifyOwner(undefined, actorId, "msg", "OWNER_ALERT")).resolves.toBeUndefined();
    expect(notifyAndEmit).not.toHaveBeenCalled();
  });

  // ─── Error handling: catches and logs notifyAndEmit failures ───
  it("should catch and log errors from notifyAndEmit without throwing", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    notifyAndEmit.mockRejectedValue(new Error("emit failed"));

    await expect(notifyOwner(mockBoard, actorId, "msg", "OWNER_ALERT")).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith("OWNER NOTIFICATION ERROR:", "emit failed");
    consoleSpy.mockRestore();
  });
});
