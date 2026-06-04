const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
} = require("../../controllers/notificationController");
const Notification = require("../../models/Notification");
const { mockReq, mockRes, fakeId } = require("../helpers");

jest.mock("../../models/Notification");

describe("notificationController", () => {
  // ═══════════════════════════════════════
  // getNotifications
  // ═══════════════════════════════════════
  describe("getNotifications", () => {
    it("should return notifications with pagination for logged in user", async () => {
      const userId = fakeId(1);
      const req = mockReq({ user: { _id: userId } });
      const res = mockRes();

      const mockNotifications = [{ _id: fakeId(10), message: "Alert" }];
      Notification.countDocuments.mockResolvedValue(1);
      Notification.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockNotifications),
            }),
          }),
        }),
      });

      await getNotifications(req, res);

      expect(Notification.countDocuments).toHaveBeenCalledWith({ user: userId });
      expect(Notification.find).toHaveBeenCalledWith({ user: userId });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        total: 1,
        pagination: {},
        data: mockNotifications,
      });
    });
  });

  // ═══════════════════════════════════════
  // markAsRead
  // ═══════════════════════════════════════
  describe("markAsRead", () => {
    it("should mark notification as read and return it", async () => {
      const userId = fakeId(1);
      const notifId = fakeId(10);
      const req = mockReq({ params: { id: notifId }, user: { _id: userId } });
      const res = mockRes();

      const mockNotif = { _id: notifId, user: userId, isRead: true };
      Notification.findOneAndUpdate.mockResolvedValue(mockNotif);

      await markAsRead(req, res);

      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: notifId, user: userId },
        { isRead: true },
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockNotif });
    });

    it("should throw 404 if notification not found or doesn't belong to user", async () => {
      const req = mockReq({ params: { id: fakeId(10) } });
      const res = mockRes();

      Notification.findOneAndUpdate.mockResolvedValue(null);

      await expect(markAsRead(req, res)).rejects.toThrow("Notification not found");
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ═══════════════════════════════════════
  // markAllAsRead
  // ═══════════════════════════════════════
  describe("markAllAsRead", () => {
    it("should update all unread notifications to read", async () => {
      const userId = fakeId(1);
      const req = mockReq({ user: { _id: userId } });
      const res = mockRes();

      Notification.updateMany.mockResolvedValue({ modifiedCount: 3 });

      await markAllAsRead(req, res);

      expect(Notification.updateMany).toHaveBeenCalledWith(
        { user: userId, isRead: false },
        { $set: { isRead: true } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "All notifications marked as read",
      });
    });
  });

  // ═══════════════════════════════════════
  // deleteNotification
  // ═══════════════════════════════════════
  describe("deleteNotification", () => {
    it("should delete notification owned by user", async () => {
      const userId = fakeId(1);
      const notifId = fakeId(10);
      const req = mockReq({ params: { id: notifId }, user: { _id: userId } });
      const res = mockRes();

      const mockNotif = {
        _id: notifId,
        user: { toString: () => userId.toString() },
        deleteOne: jest.fn().mockResolvedValue({}),
      };
      Notification.findById.mockResolvedValue(mockNotif);

      await deleteNotification(req, res);

      expect(mockNotif.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should throw 404 if notification not found", async () => {
      const req = mockReq({ params: { id: fakeId(10) } });
      const res = mockRes();

      Notification.findById.mockResolvedValue(null);

      await expect(deleteNotification(req, res)).rejects.toThrow("Notification not found");
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should throw 403 if user doesn't own notification", async () => {
      const userId = fakeId(1);
      const strangerId = fakeId(9);
      const notifId = fakeId(10);
      const req = mockReq({ params: { id: notifId }, user: { _id: strangerId } });
      const res = mockRes();

      const mockNotif = {
        _id: notifId,
        user: { toString: () => userId.toString() },
      };
      Notification.findById.mockResolvedValue(mockNotif);

      await expect(deleteNotification(req, res)).rejects.toThrow("Not authorized to delete this notification");
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ═══════════════════════════════════════
  // deleteReadNotifications
  // ═══════════════════════════════════════
  describe("deleteReadNotifications", () => {
    it("should clear read notifications for user", async () => {
      const userId = fakeId(1);
      const req = mockReq({ user: { _id: userId } });
      const res = mockRes();

      Notification.deleteMany.mockResolvedValue({ deletedCount: 5 });

      await deleteReadNotifications(req, res);

      expect(Notification.deleteMany).toHaveBeenCalledWith({
        user: userId,
        isRead: true,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
