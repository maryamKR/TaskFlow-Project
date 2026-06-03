const mongoose = require("mongoose");

// Increase Jest timeout for database connection/operations
jest.setTimeout(30000);

// Mock Socket.io globally for integration tests
jest.mock("../../socket", () => {
  const mockEmit = jest.fn();
  const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
  const mockIO = {
    to: mockTo,
    in: jest.fn().mockReturnValue({
      fetchSockets: jest.fn().mockResolvedValue([]),
    }),
    emit: mockEmit,
  };
  return {
    initIO: jest.fn().mockReturnValue(mockIO),
    getIO: jest.fn().mockReturnValue(mockIO),
  };
});

// Mock Email Service globally to prevent real email transmission
jest.mock("../../utils/emailService", () => ({
  sendInviteEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendOverdueTaskEmail: jest.fn().mockResolvedValue(undefined),
  sendUnregisteredInviteEmail: jest.fn().mockResolvedValue(undefined),
}));

beforeAll(async () => {
  // Ensure we are connected to the test database with a retry mechanism for transient network drops
  if (mongoose.connection.readyState === 0) {
    let retries = 3;
    while (retries > 0) {
      try {
        await mongoose.connect(process.env.MONGO_URI);
        break;
      } catch (err) {
        retries -= 1;
        if (retries === 0) {
          throw err;
        }
        console.warn(`MongoDB connection failed. Retrying in 2s... (${retries} attempts left)`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
});

// Clear all database collection state between individual tests
afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
