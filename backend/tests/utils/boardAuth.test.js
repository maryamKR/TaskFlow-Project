const { hasBoardAccess } = require("../../utils/boardAuth");
const { fakeId } = require("../helpers");

describe("hasBoardAccess", () => {
  const ownerId = fakeId(1);
  const coworkerId = fakeId(2);
  const strangerId = fakeId(9);

  // ─── Owner checks ───
  it("should return true when userId matches board.user (string ID)", () => {
    const board = {
      user: ownerId,
      coworkers: [],
    };
    expect(hasBoardAccess(board, ownerId)).toBe(true);
  });

  it("should return true when userId matches board.user (populated _id object)", () => {
    const board = {
      user: { _id: ownerId },
      coworkers: [],
    };
    expect(hasBoardAccess(board, ownerId)).toBe(true);
  });

  // ─── Coworker checks ───
  it("should return true when userId is in coworkers array (string IDs)", () => {
    const board = {
      user: ownerId,
      coworkers: [coworkerId],
    };
    expect(hasBoardAccess(board, coworkerId)).toBe(true);
  });

  it("should return true when userId is in coworkers array (populated _id objects)", () => {
    const board = {
      user: ownerId,
      coworkers: [{ _id: coworkerId }],
    };
    expect(hasBoardAccess(board, coworkerId)).toBe(true);
  });

  it("should return true when coworkers has multiple members and user is one", () => {
    const board = {
      user: ownerId,
      coworkers: [fakeId(3), coworkerId, fakeId(4)],
    };
    expect(hasBoardAccess(board, coworkerId)).toBe(true);
  });

  // ─── Unhappy: non-member ───
  it("should return false when userId is neither owner nor coworker", () => {
    const board = {
      user: ownerId,
      coworkers: [coworkerId],
    };
    expect(hasBoardAccess(board, strangerId)).toBe(false);
  });

  it("should return false when coworkers array is empty and user is not owner", () => {
    const board = {
      user: ownerId,
      coworkers: [],
    };
    expect(hasBoardAccess(board, strangerId)).toBe(false);
  });
});
