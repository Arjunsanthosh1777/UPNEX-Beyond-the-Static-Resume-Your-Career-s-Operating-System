import { verifyToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  const token = req.cookies?.upnex_token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ message: "Insufficient permissions." });
    }
    next();
  };
}