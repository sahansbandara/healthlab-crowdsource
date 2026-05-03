require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
console.log("MONGODB_URI:", process.env.MONGODB_URI);
console.log("MONGO_DB_NAME:", process.env.MONGO_DB_NAME);
console.log("JWT_SECRET:", process.env.JWT_SECRET);
process.exit(0);
