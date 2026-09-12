import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { signToken } from "../utils/jwt.js";

const authSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(100)
});

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000
};

export async function register(req, res) {
  const data = authSchema.parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });

  if (exists) return res.status(409).json({ message: "Email already registered." });

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name || "UPNEX Learner",
      email: data.email,
      passwordHash
    },
    select: { id: true, name: true, email: true, role: true }
  });

  res.cookie("upnex_token", signToken(user), cookieOptions);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const data = authSchema.omit({ name: true }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.cookie("upnex_token", signToken(safeUser), cookieOptions);
  res.json({ user: safeUser });
}

export function logout(req, res) {
  res.clearCookie("upnex_token", cookieOptions);
  res.json({ message: "Logged out." });
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.auth.id },
    select: { id: true, name: true, email: true, role: true, avatar: true }
  });

  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ user });
}