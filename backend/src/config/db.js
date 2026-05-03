const mongoose = require("mongoose");

const DB_NAME = "af_project_db";
let dbInstance = null;

/**
 * Single MongoDB connection to af_project_db.
 * All models are registered on this connection.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME || DB_NAME;

  if (!uri) throw new Error("MONGODB_URI or MONGO_URI missing");

  console.log(`🔌 Mongoose: Input URI from env: ${uri.replace(/:([^:@]+)@/, ":****@")}`);
  console.log(`⏳ MongoDB: Connecting to ${uri.replace(/:([^:@]+)@/, ":****@")}...`);

  try {
    // Build URI with dbName: replace existing path or append if missing
    const queryIdx = uri.indexOf("?");
    const queryPart = queryIdx >= 0 ? uri.slice(queryIdx) : "";
    let baseUri = queryIdx >= 0 ? uri.slice(0, queryIdx) : uri;

    // Remove any trailing slashes to avoid double slashes
    baseUri = baseUri.replace(/\/+$/, "");

    // Find where the credentials/host ends and the path starts
    const protocolEnd = baseUri.indexOf("://");
    const firstSlashAfterProtocol = baseUri.indexOf("/", protocolEnd + 3);

    let finalUri;
    if (firstSlashAfterProtocol === -1) {
      // No path present, append it safely
      finalUri = `${baseUri}/${dbName}${queryPart}`;
    } else {
      // Replace the existing path with the desired dbName
      finalUri = `${baseUri.slice(0, firstSlashAfterProtocol + 1)}${dbName}${queryPart}`;
    }
    console.log(`🔌 Mongoose: Final connection string: ${finalUri.replace(/:([^:@]+)@/, ":****@")}`);

    const options = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 if needed
    };

    let retries = 5;
    while (retries > 0) {
      try {
        await mongoose.connect(finalUri, options);
        break;
      } catch (err) {
        retries -= 1;
        console.error(`❌ MongoDB Connection Attempt Failed. Retries left: ${retries}`);
        if (retries === 0) throw err;
        await new Promise(res => setTimeout(res, 3000));
      }
    }

    dbInstance = mongoose.connection.useDb(dbName, { useCache: true });
    console.log(`✅ MongoDB: Connected to ${dbName} (single database)`);
    return dbInstance;
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    throw error;
  }
};

/** @returns {mongoose.mongo.MongoClient} Mongoose connection useDb(af_project_db) */
function getDb() {
  const dbName = process.env.MONGO_DB_NAME || DB_NAME;
  return dbInstance || mongoose.connection.useDb(dbName, { useCache: true });
}

module.exports = {
  connectDB,
  get db() {
    return getDb();
  },
};
