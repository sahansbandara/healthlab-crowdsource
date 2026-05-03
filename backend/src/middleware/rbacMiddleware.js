/**
 * RBAC (Role-Based Access Control) Middleware
 * Part B: Compliance Middleware
 * 
 * Ensures users can only access endpoints appropriate for their role
 * Example: A "Student" cannot view participant lists; only "Researcher" can
 */

// Middleware to check if user has required roles
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // In a real app, this would come from JWT token verification
    // For now, we expect it to be set in req.user or req.headers
    const userRole = req.user?.role || req.headers["x-user-role"];

    if (!userRole) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "No user role found. Please login.",
      });
    }

    // Check if user's role is in the allowed list
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}. Your role: ${userRole}`,
      });
    }

    next();
  };
};

// Middleware to extract user info from header (mock auth for development)
const extractUserFromHeader = (req, res, next) => {
  // Mock: In production, this comes from JWT verification
  // For testing, we read from custom headers: x-user-id, x-user-role
  
  const userId = req.headers["x-user-id"];
  const role = req.headers["x-user-role"];

  if (userId && role) {
    req.user = {
      id: userId,
      role: role,
    };
  }

  next();
};

module.exports = {
  requireRole,
  extractUserFromHeader,
};
