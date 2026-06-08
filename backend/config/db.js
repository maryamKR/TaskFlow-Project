const mongoose = require("mongoose");
const dns = require("dns");

// Node's resolver is pointed at a local DNS proxy (127.0.0.1) that refuses
// SRV queries (ECONNREFUSED), even though the OS resolver works fine. Point
// Node at a public resolver so `mongodb+srv://` SRV lookups can succeed.
if (dns.getServers().some((server) => server === "127.0.0.1")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

// Disable command buffering — queries fail immediately instead of hanging
// when the DB connection is unavailable, rather than timing out after 10s
mongoose.set("bufferCommands", false);

mongoose.set("returnDocument", "after");

const connectDB = async (retries = 5, delay = 5000) => {
  while (retries > 0) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000, // Fail fast: 5s instead of default 30s
      });
      console.log(` MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      retries--;
      console.error(`Database Connection Error: ${error.message}`);
      if (retries === 0) {
        console.error("Max database connection retries reached. Exiting...");
        process.exit(1);
      }
      console.log(
        `Retrying database connection in ${delay / 1000}s... (${retries} retries left)`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

module.exports = connectDB;
