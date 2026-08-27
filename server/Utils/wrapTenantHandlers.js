const withTenantPrisma = require("../Utils/withTenantPrisma");

/**
 * Wraps all controller handlers with tenant prisma middleware
 * Automatically injects:
 *   - req.prisma: Tenant-specific Prisma client
 *   - req.user: Decoded JWT token { userId, role, permissions, tenant_id, db_name }
 *
 * Usage: module.exports = wrapTenantHandlers({ handler1, handler2, ... });
 */
const wrapTenantHandlers = (handlers) => {
  return Object.fromEntries(
    Object.entries(handlers).map(([key, handler]) => [
      key,
      withTenantPrisma(handler),
    ])
  );
};

module.exports = wrapTenantHandlers;
