const notifyAndEmit = require("../../utils/notifyAndEmit");
const Notification = require("../../models/Notification");
const { getIO } = require("../../socket");
const { fakeId } = require("../helpers");

jest.mock("../../models/Notification");
jest.mock("../../socket");

describe("notifyAndEmit", () => {
  const recipientId = fakeId(1);
  const senderId = fakeId(2);
  const boardId = fakeId(3);

  const mockEmit = jest.fn();
  const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });

  beforeEach(() => {
    getIO.mockReturnValue({ to: mockTo });
  });

  // ─── Happy path ───
  it("should create a notification, populate sender, and emit to user room", async () => {
    const mockNotification = {
      _id: fakeId(10),
      user: recipientId,
      sender: senderId,
      message: "Test message",
      type: "TASK_ASSIGNED",
      populate: jest.fn().mockResolvedValue(undefined),
    };

    Notification.create.mockResolvedValue(mockNotification);

    const result = await notifyAndEmit({
      recipientId,
      senderId,
      message: "Test message",
      type: "TASK_ASSIGNED",
      relatedId: fakeId(5),
      boardId,
    });

    // Verify DB creation
    expect(Notification.create).toHaveBeenCalledWith({
      user: recipientId,
      sender: senderId,
      message: "Test message",
      type: "TASK_ASSIGNED",
      relatedId: fakeId(5),
      boardId,
    });

    // Verify populate was called
    expect(mockNotification.populate).toHaveBeenCalledWith("sender", "username email");

    // Verify socket emission to user room
    expect(mockTo).toHaveBeenCalledWith(`user:${recipientId}`);
    expect(mockEmit).toHaveBeenCalledWith("new_notification", {
      notification: mockNotification,
    });

    // Verify return value
    expect(result).toBe(mockNotification);
  });

  // ─── Unhappy: DB failure is caught ───
  it("should catch errors and return null when Notification.create fails", async () => {
    Notification.create.mockRejectedValue(new Error("DB write failed"));

    const result = await notifyAndEmit({
      recipientId,
      senderId,
      message: "msg",
      type: "COMMENT",
    });

    expect(result).toBeNull();
  });

  // ─── Unhappy: socket.io not initialized is caught ───
  it("should catch errors and return null when getIO throws", async () => {
    const mockNotification = {
      populate: jest.fn().mockResolvedValue(undefined),
    };
    Notification.create.mockResolvedValue(mockNotification);
    getIO.mockImplementation(() => {
      throw new Error("Socket.io has not been initialized!");
    });

    const result = await notifyAndEmit({
      recipientId,
      senderId,
      message: "msg",
      type: "COMMENT",
    });

    expect(result).toBeNull();
  });
});
