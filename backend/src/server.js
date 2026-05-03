require("dotenv").config();
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
console.log("🌐 DNS: Forced to Google DNS (8.8.8.8)");


const { connectDB } = require("./config/db");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;

/**
 * Robust Startup Sequence: Await DB -> Start Listener
 */
const boot = async () => {
  try {
    // 1. Await Database connection before proceeding
    await connectDB();

    // 2. Load app after DB is connected (ensures models bind correctly)
    const app = require("./app");

    // 3. Start HTTP Listener
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server: Listening on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    /**
     * Graceful Shutdown Handler
     */
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        console.log("📡 Server: HTTP connections closed.");
        try {
          await mongoose.connection.close(false);
          console.log("💾 MongoDB: Connection closed.");
          process.exit(0);
        } catch (err) {
          console.error("❌ Shutdown: Error closing DB:", err);
          process.exit(1);
        }
      });

      // Force exit after 10s if graceful shutdown hangs
      setTimeout(() => {
        console.error("⚠️ Shutdown: Could not close connections in time, forcing exit.");
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

  } catch (error) {
    console.error("❌ Startup: Fatal crash during boot sequence.");
    console.error(error);
    process.exit(1);
  }
};

/**
 * Handle Globally Unhandled Errors
 */
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error);
  process.exit(1);
});

boot();
