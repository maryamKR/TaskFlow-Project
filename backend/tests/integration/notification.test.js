require("./setup");
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const jwt = require("jsonwebtoken");

describe("Notification Integration Tests", () => {
  let userToken;
  let user;

  beforeEach(async () => {
    user = await User.create({
      username: "notifyuser",
      email: "notify@test.com",
      password: "password123",
    });

    userToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  });

  // ─── Get Notifications ───
  describe("GET /api/notifications", () => {
    it("should return notifications for the authenticated user", async () => {
      const otherUser = await User.create({
        username: "inviter",
        email: "inviter@test.com",
        password: "password123",
      });

      await Notification.create({
        user: user._id,
        sender: otherUser._id,
        message: "You have a new task assigned.",
        type: "TASK_ASSIGNED",
      });

      const response = await request(app)
        .get("/api/notifications")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty("message", "You have a new task assigned.");
      expect(response.body.data[0].sender).toHaveProperty("username", otherUser.username);
    });
  });

  // ─── Mark As Read ───
  describe("PATCH /api/notifications/:id/read", () => {
    it("should mark a single notification as read", async () => {
      const notif = await Notification.create({
        user: user._id,
        sender: user._id,
        message: "Unread notification",
        type: "COMMENT",
        isRead: false,
      });

      const response = await request(app)
        .patch(`/api/notifications/${notif._id}/read`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("isRead", true);

      // Verify DB change
      const updatedNotif = await Notification.findById(notif._id);
      expect(updatedNotif.isRead).toBe(true);
    });
  });

  // ─── Mark All As Read ───
  describe("PATCH /api/notifications/read-all", () => {
    it("should mark all user's notifications as read", async () => {
      await Notification.create({
        user: user._id,
        sender: user._id,
        message: "Notif 1",
        type: "COMMENT",
        isRead: false,
      });
      await Notification.create({
        user: user._id,
        sender: user._id,
        message: "Notif 2",
        type: "COMMENT",
        isRead: false,
      });

      await request(app)
        .patch("/api/notifications/read-all")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      // Verify all DB notifications for user are marked read
      const unread = await Notification.find({ user: user._id, isRead: false });
      expect(unread).toHaveLength(0);
    });
  });

  // ─── Delete Read Notifications ───
  describe("DELETE /api/notifications/read", () => {
    it("should clear read notifications only", async () => {
      const readNotif = await Notification.create({
        user: user._id,
        sender: user._id,
        message: "Read notif",
        type: "COMMENT",
        isRead: true,
      });

      const unreadNotif = await Notification.create({
        user: user._id,
        sender: user._id,
        message: "Unread notif",
        type: "COMMENT",
        isRead: false,
      });

      await request(app)
        .delete("/api/notifications/read")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      // Verify read is deleted, unread is kept
      expect(await Notification.findById(readNotif._id)).toBeNull();
      expect(await Notification.findById(unreadNotif._id)).toBeTruthy();
    });
  });
});
