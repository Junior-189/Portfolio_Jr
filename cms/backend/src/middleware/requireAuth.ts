import type { Request, Response, NextFunction } from "express";
import { verifySession } from "../lib/auth";

export interface AuthedRequest extends Request {
  user?: { username: string };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  req.user = session;
  next();
}
