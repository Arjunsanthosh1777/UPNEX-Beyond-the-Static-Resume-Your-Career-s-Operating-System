// Minimal env so modules that read configuration at import time (jwt, database)
// have what they need during unit tests. No real DB connection is made because
// the Prisma client is mocked in the tests themselves.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
