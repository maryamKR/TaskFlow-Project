const { getBoardMembers, inviteMember, removeMember } = require("../../controllers/boardMemberController");
const Board = require("../../models/Board");
const User = require("../../models/User");
const { hasBoardAccess } = require("../../utils/boardAuth");
const notifyAndEmit = require("../../utils/notifyAndEmit");
const { notifyOwner } = require("../../utils/notifyOwner");
const { sendInviteEmail, sendUnregisteredInviteEmail } = require("../../utils/emailService");
const { mockReq, mockRes, fakeId } = require("../helpers");

jest.mock("../../models/Board");
jest.mock("../../models/User");
jest.mock("../../utils/boardAuth");
jest.mock("../../utils/notifyAndEmit");
jest.mock("../../utils/notifyOwner");
jest.mock("../../utils/emailService");

describe("boardMemberController", () => {
  beforeEach(() => {
    notifyAndEmit.mockResolvedValue({});
    notifyOwner.mockResolvedValue(undefined);
    sendInviteEmail.mockResolvedValue(undefined);
    sendUnregisteredInviteEmail.mockResolvedValue(undefined);

    // Mock Mongoose's addToSet method for plain arrays in test mock objects
    if (!Array.prototype.addToSet) {
      Array.prototype.addToSet = function(item) {
        if (!this.includes(item)) {
          this.push(item);
        }
        return this;
      };
    }
  });

  // ═══════════════════════════════════════
  // getBoardMembers
  // ═══════════════════════════════════════
  describe("getBoardMembers", () => {
    it("should return all members (owner + coworkers)", async () => {
      const req = mockReq({ params: { boardId: fakeId(1) } });
      const res = mockRes();

      const owner = { _id: fakeId(1), username: "owner" };
      const coworker = { _id: fakeId(2), username: "coworker" };
      const mockBoard = { _id: fakeId(1), user: owner, coworkers: [coworker] };

      Board.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockBoard),
        }),
      });
      hasBoardAccess.mockReturnValue(true);

      await getBoardMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([owner, coworker]);
    });

    it("should throw 404 when board not found", async () => {
      const req = mockReq({ params: { boardId: fakeId(1) } });
      const res = mockRes();

      Board.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(getBoardMembers(req, res)).rejects.toThrow("Board not found");
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should throw 403 when user has no access", async () => {
      const req = mockReq({ params: { boardId: fakeId(1) } });
      const res = mockRes();

      Board.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({ _id: fakeId(1), user: {}, coworkers: [] }),
        }),
      });
      hasBoardAccess.mockReturnValue(false);

      await expect(getBoardMembers(req, res)).rejects.toThrow("You do not have access");
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ═══════════════════════════════════════
  // inviteMember
  // ═══════════════════════════════════════
  describe("inviteMember", () => {
    it("should invite a registered user successfully", async () => {
      const ownerId = fakeId(1);
      const req = mockReq({
        body: { email: "coworker@test.com" },
        params: { boardId: fakeId(5) },
        user: { _id: ownerId, username: "owner" },
      });
      const res = mockRes();

      const mockBoard = {
        _id: fakeId(5),
        title: "Board",
        user: ownerId,
        coworkers: [],
        save: jest.fn(),
      };
      mockBoard.coworkers.some = jest.fn().mockReturnValue(false);
      Board.findById.mockResolvedValue(mockBoard);

      const invitedUser = { _id: fakeId(2), username: "invited", email: "coworker@test.com" };
      User.findOne.mockResolvedValue(invitedUser);

      await inviteMember(req, res);

      expect(mockBoard.coworkers).toContain(invitedUser._id);
      expect(mockBoard.save).toHaveBeenCalled();
      expect(notifyAndEmit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle unregistered user with pending invite", async () => {
      const ownerId = fakeId(1);
      const req = mockReq({
        body: { email: "new@test.com" },
        params: { boardId: fakeId(5) },
        user: { _id: ownerId, username: "owner", email: "owner@test.com" },
      });
      const res = mockRes();

      const mockBoard = {
        _id: fakeId(5),
        title: "Board",
        user: ownerId,
        pendingInvites: [],
        coworkers: [],
        save: jest.fn(),
      };
      Board.findById.mockResolvedValue(mockBoard);
      User.findOne.mockResolvedValue(null);

      await inviteMember(req, res);

      expect(mockBoard.pendingInvites).toContain("new@test.com");
      expect(sendUnregisteredInviteEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should throw 404 when board not found", async () => {
      const req = mockReq({ body: { email: "a@b.com" }, params: { boardId: fakeId(1) } });
      const res = mockRes();
      Board.findById.mockResolvedValue(null);

      await expect(inviteMember(req, res)).rejects.toThrow("Board not found");
    });

    it("should throw 403 when non-owner tries to invite", async () => {
      const req = mockReq({
        body: { email: "a@b.com" },
        params: { boardId: fakeId(1) },
        user: { _id: fakeId(9) },
      });
      const res = mockRes();
      Board.findById.mockResolvedValue({ _id: fakeId(1), user: fakeId(1) });

      await expect(inviteMember(req, res)).rejects.toThrow("Only the board owner can invite");
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("should throw 400 when inviting yourself", async () => {
      const ownerId = fakeId(1);
      const req = mockReq({
        body: { email: "self@test.com" },
        params: { boardId: fakeId(5) },
        user: { _id: ownerId },
      });
      const res = mockRes();

      Board.findById.mockResolvedValue({ _id: fakeId(5), user: ownerId, coworkers: [] });
      User.findOne.mockResolvedValue({ _id: ownerId });

      await expect(inviteMember(req, res)).rejects.toThrow("You cannot invite yourself to your own board");
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should throw 400 when user is already a member", async () => {
      const ownerId = fakeId(1);
      const memberId = fakeId(2);
      const req = mockReq({
        body: { email: "member@test.com" },
        params: { boardId: fakeId(5) },
        user: { _id: ownerId },
      });
      const res = mockRes();

      const mockBoard = {
        _id: fakeId(5),
        user: ownerId,
        coworkers: [memberId],
      };
      mockBoard.coworkers.some = jest.fn().mockReturnValue(true);
      Board.findById.mockResolvedValue(mockBoard);
      User.findOne.mockResolvedValue({ _id: memberId });

      await expect(inviteMember(req, res)).rejects.toThrow("User is already a member");
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should throw 400 when unregistered user is already invited", async () => {
      const ownerId = fakeId(1);
      const req = mockReq({
        body: { email: "pending@test.com" },
        params: { boardId: fakeId(5) },
        user: { _id: ownerId },
      });
      const res = mockRes();

      Board.findById.mockResolvedValue({
        _id: fakeId(5),
        user: ownerId,
        pendingInvites: ["pending@test.com"],
        coworkers: [],
      });
      User.findOne.mockResolvedValue(null);

      await expect(inviteMember(req, res)).rejects.toThrow("User is already invited");
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ═══════════════════════════════════════
  // removeMember
  // ═══════════════════════════════════════
  describe("removeMember", () => {
    it("should remove member successfully", async () => {
      const ownerId = fakeId(1);
      const memberId = fakeId(2);
      const req = mockReq({
        params: { boardId: fakeId(5), memberId },
        user: { _id: ownerId },
      });
      const res = mockRes();

      const mockBoard = {
        _id: fakeId(5),
        title: "Board",
        user: ownerId,
        coworkers: [{ toString: () => memberId }],
        save: jest.fn(),
      };
      mockBoard.coworkers.some = jest.fn().mockReturnValue(true);
      mockBoard.coworkers.filter = jest.fn().mockReturnValue([]);
      Board.findById.mockResolvedValue(mockBoard);

      await removeMember(req, res);

      expect(mockBoard.save).toHaveBeenCalled();
      expect(notifyAndEmit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should throw 404 when board not found", async () => {
      const req = mockReq({ params: { boardId: fakeId(1), memberId: fakeId(2) } });
      const res = mockRes();
      Board.findById.mockResolvedValue(null);

      await expect(removeMember(req, res)).rejects.toThrow("Board not found");
    });

    it("should throw 403 when non-owner tries to remove", async () => {
      const req = mockReq({
        params: { boardId: fakeId(1), memberId: fakeId(2) },
        user: { _id: fakeId(9) },
      });
      const res = mockRes();
      Board.findById.mockResolvedValue({ _id: fakeId(1), user: fakeId(1) });

      await expect(removeMember(req, res)).rejects.toThrow("Only the board owner can remove members");
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("should throw 400 when trying to remove the board owner", async () => {
      const ownerId = fakeId(1);
      const req = mockReq({
        params: { boardId: fakeId(5), memberId: ownerId },
        user: { _id: ownerId },
      });
      const res = mockRes();
      Board.findById.mockResolvedValue({ _id: fakeId(5), user: ownerId });

      await expect(removeMember(req, res)).rejects.toThrow("You cannot remove the board owner");
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should throw 400 when user is not a member", async () => {
      const ownerId = fakeId(1);
      const req = mockReq({
        params: { boardId: fakeId(5), memberId: fakeId(9) },
        user: { _id: ownerId },
      });
      const res = mockRes();

      const mockBoard = {
        _id: fakeId(5),
        user: ownerId,
        coworkers: [],
      };
      mockBoard.coworkers.some = jest.fn().mockReturnValue(false);
      Board.findById.mockResolvedValue(mockBoard);

      await expect(removeMember(req, res)).rejects.toThrow("This user is not a member of this board");
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
