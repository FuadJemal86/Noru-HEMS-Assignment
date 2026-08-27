const { PrismaClient } = require("../generated/prisma");

// Configure Prisma client with connection pool settings
// Connection pool settings can be set in DATABASE_URL:
// postgresql://user:password@host:port/database?connection_limit=50&pool_timeout=20
// 
// If not set in DATABASE_URL, Prisma defaults to:
// - connection_limit: num_physical_cpus * 2 + 1 (typically 21)
// - pool_timeout: 10 seconds
//
// We'll automatically add connection pool settings if not present in DATABASE_URL
let databaseUrl = process.env.DATABASE_URL || "";

// Add connection pool parameters if not already present
if (databaseUrl && !databaseUrl.includes("connection_limit")) {
  const separator = databaseUrl.includes("?") ? "&" : "?";
  databaseUrl = `${databaseUrl}${separator}connection_limit=50&pool_timeout=20`;
}

function normalizeDateField(dateField) {
  for (const op of ['gte', 'lt', 'lte', 'gt']) {
    if (dateField[op] && dateField[op] instanceof Date) {
      const d = dateField[op];
      dateField[op] = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
    }
  }
  return dateField;
}

function normalizeResultDates(result) {
  if (Array.isArray(result)) {
    result.forEach((item) => {
      if (item?.date instanceof Date) {
        item.date = new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate(), 0, 0, 0, 0);
      }
    });
  } else if (result?.date instanceof Date) {
    result.date = new Date(result.date.getFullYear(), result.date.getMonth(), result.date.getDate(), 0, 0, 0, 0);
  }
  return result;
}

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

// Prisma extension to prevent timezone conversion issues for timesheet dates
const main = basePrisma.$extends({
  query: {
    timesheet: {
      async $allOperations({ args, query }) {
        if (args?.where?.date) {
          const dateField = args.where.date;
          if (dateField instanceof Date) {
            const d = dateField;
            args.where.date = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
          } else {
            normalizeDateField(dateField);
          }
        }
        const result = await query(args);
        return normalizeResultDates(result);
      },
    },
  },
});

// Ensure connections are properly managed
// Disconnect on process termination
process.on('beforeExit', async () => {
  await main.$disconnect();
});

process.on('SIGINT', async () => {
  await main.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await main.$disconnect();
  process.exit(0);
});

// Note: To fix connection pool timeout errors, update your DATABASE_URL:
// Add ?connection_limit=50&pool_timeout=20 to increase pool size and timeout
// Example: postgresql://user:pass@host:port/db?connection_limit=50&pool_timeout=20

// Custom error class for unauthorized access
class UnauthorizedError extends Error {
  constructor(message = "Unauthorized access", statusCode = 401) {
    super(message);
    this.name = "UnauthorizedError";
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Get tenant Prisma client (currently returns main client)
// Can be extended for multi-tenant support in the future
const getTenantPrisma = (req) => {
  // For now, return the main Prisma client
  // In a multi-tenant setup, you would determine the tenant from req.user
  // and return the appropriate Prisma client instance
  return main;
};

module.exports = {
  main,
  getTenantPrisma,
  UnauthorizedError,
};
