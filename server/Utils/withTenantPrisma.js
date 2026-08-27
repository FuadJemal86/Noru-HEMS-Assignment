const { getTenantPrisma, UnauthorizedError } = require("../prisma/prisma");
const jwt = require("jsonwebtoken");

/**
 * Wrapper to automatically inject tenant prisma client and decoded user info
 * Injects: req.prisma (tenant database) and req.user (decoded JWT)
 * Usage: const getCustomers = withTenantPrisma(async (req, res) => { ... });
 */
const withTenantPrisma = (handler) => {
  return async (req, res, next) => {
    try {
      // Get token from cookie or authorization header
      const token =
        req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");

      // Decode and inject user info
      if (token) {
        try {
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "your-secret-key"
          );
          req.user = decoded; // Inject decoded JWT: { userId, role, tenant_id, db_name, store_id }

          // Extract staff ID from request headers (set by frontend interceptor)
          const staffId = req.headers["x-staff-id"];
          if (staffId) {
            req.user.current_staff_id = staffId;
          }
        } catch (jwtError) {
          // Invalid token - continue without user info
          req.user = null;
        }
      } else {
        req.user = null;
      }

      // Inject tenant prisma client
      req.prisma = getTenantPrisma(req);

      // Execute handler and catch any errors
      const result = await handler(req, res, next);
      return result;
    } catch (error) {
      // Handle UnauthorizedError explicitly
      if (UnauthorizedError && error instanceof UnauthorizedError) {
        return res.status(error.statusCode || 401).json({
          success: false,
          error: error.message,
        });
      }

      // For other errors, pass to error handler middleware via next()
      next(error);
    }
  };
};

module.exports = withTenantPrisma;
