import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Prisma client so no real database is required.
vi.mock("../src/config/database.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }
}));

// Mock JWT signing so tests never depend on a real secret/algorithm.
vi.mock("../src/utils/jwt.js", () => ({
  signToken: vi.fn(() => "test-token")
}));

import { prisma } from "../src/config/database.js";
import { register, login } from "../src/controllers/authController.js";

function createRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.cookie = vi.fn(() => res);
  return res;
}

describe("authController.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a duplicate email with 409", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "taken@example.com" });
    const req = { body: { name: "Existing User", email: "taken@example.com", password: "password123" } };
    const res = createRes();

    await register(req, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "taken@example.com" } });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "Email already registered." });
  });

  it("creates the user, sets a cookie, and returns 201 on success", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: "u2", name: "New Learner", email: "new@example.com", role: "STUDENT" });
    const req = { body: { name: "New Learner", email: "new@example.com", password: "password123" } };
    const res = createRes();

    await register(req, res);

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(res.cookie).toHaveBeenCalledWith("upnex_token", "test-token", expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      user: { id: "u2", name: "New Learner", email: "new@example.com", role: "STUDENT" }
    });
  });

  it("throws a ZodError for invalid input (bad email, short password)", async () => {
    const req = { body: { name: "X", email: "not-an-email", password: "short" } };
    const res = createRes();

    await expect(register(req, res)).rejects.toThrow();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("authController.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-existent user with 401", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const req = { body: { email: "ghost@example.com", password: "password123" } };
    const res = createRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid email or password." });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("rejects a bad password with 401", async () => {
    // bcrypt hash of "correct-password"; comparing against a different input fails.
    const passwordHash = "$2a$12$ZY8H1Yw8mQm4Xr3w1s2s9u2H0hZ6o3v8L0kQ9pQ1sQ2wQ3eQ4rQ5m";
    prisma.user.findUnique.mockResolvedValue({ id: "u3", name: "Real", email: "real@example.com", role: "STUDENT", passwordHash });
    const req = { body: { email: "real@example.com", password: "wrong-password" } };
    const res = createRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid email or password." });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("returns a safe user and sets a cookie on valid credentials", async () => {
    const bcrypt = (await import("bcryptjs")).default;
    const passwordHash = await bcrypt.hash("password123", 12);
    prisma.user.findUnique.mockResolvedValue({ id: "u4", name: "Valid", email: "valid@example.com", role: "STUDENT", passwordHash });
    const req = { body: { email: "valid@example.com", password: "password123" } };
    const res = createRes();

    await login(req, res);

    expect(res.cookie).toHaveBeenCalledWith("upnex_token", "test-token", expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({
      user: { id: "u4", name: "Valid", email: "valid@example.com", role: "STUDENT" }
    });
    // Password hash must never be leaked to the client.
    const payload = res.json.mock.calls[0][0];
    expect(payload.user).not.toHaveProperty("passwordHash");
  });

  it("throws a ZodError for invalid input (bad email, short password)", async () => {
    const req = { body: { email: "bad", password: "x" } };
    const res = createRes();

    await expect(login(req, res)).rejects.toThrow();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
