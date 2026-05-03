const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../config/constants");

const protect = async (req, res, next) => {
  let token;

  console.log(`📡 Auth Middleware: Checking headers...`);
  console.log(`   Authorization: ${req.headers.authorization ? 'Present' : 'MISSING'}`);

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];
      console.log(`   Token found. Verifying...`);

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(`   Token verified for user ID: ${decoded.id || decoded.userId}`);

      // Get user from the token - handle both 'id' and 'userId' for compatibility
      const id = decoded.id || decoded.userId;
      if (!id) {
        console.log("❌ Auth: No id/userId found in token");
        return res.status(401).json({ message: "Not authorized. Token payload missing ID." });
      }

      console.log(`⏳ Auth: Looking up user ${id} in ${User.db.name}...`);
      req.user = await User.findById(id).select("-password");

      if (!req.user) {
        console.log(`❌ Auth: User ${id} not found in ${User.db.name}`);
        return res.status(401).json({ message: `User ${id} not found in ${User.db.name}` });
      }

      console.log(`✅ Auth: Authenticated user ${req.user.email}`);
      console.log(`   Profile: Gender [${req.user.gender}], Age [${req.user.age}], BMI [${req.user.bmi}], Activity [${req.user.activityLevel || "N/A"}], Sleep [${req.user.sleepPatterns || "N/A"}], Smoking [${req.user.smokingStatus || "N/A"}]`);
      return next();
    } catch (error) {
      console.error("❌ Auth Error during verification:", error.message);
      return res.status(401).json({ message: "Not authorized", error: error.message });
    }
  }

  if (!token) {
    console.log("❌ Auth: No Bearer token found in headers");
    console.log("   Full Authorization Header:", req.headers.authorization);
    return res.status(401).json({ message: "Authentication required", error: "No token provided" });
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }
  next();
};
const authorize = (...args) => {
  const allowedRoles = args.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
    }
    const role = req.user.role || req.headers["x-user-role"];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}. Your role: ${role}`,
      });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      req.user = null;
      return next();
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id name email role");
    req.user = user || null;
    next();
  } catch {
    req.user = null;
    next();
  }
};

module.exports = {
  protect,
  requireAuth,
  authorize,
  optionalAuth,
};
