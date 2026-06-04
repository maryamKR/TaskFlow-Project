const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Increase Jest timeout for database connection/operations
jest.setTimeout(60000);

let mongoServer;

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
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    let retries = 3;
    while (retries > 0) {
      try {
        await mongoose.connect(mongoUri);
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
  if (mongoServer) {
    await mongoServer.stop();
  }
});
