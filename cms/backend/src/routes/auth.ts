import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signSession } from "../lib/auth";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";

const router = Router();

// 10 attempts per 15 minutes per IP — slows down credential-stuffing /
// brute-force attempts against the single admin account without
// getting in the way of a real login.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Username and password are required." });

  const { username, password } = parsed.data;
  const user = await prisma.adminUser.findUnique({ where: { username } });

  // Compare against a dummy hash when the user doesn't exist so the
  // response time doesn't leak whether the username is valid.
  const hash = user?.passwordHash ?? "$2a$10$MDAOQINEMn9BI.LIgBOqCuxPqk3/7/i0j2SMttc07VLruEAgDLSGG";
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const token = signSession({ username: user.username });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 60 * 60 * 1000,
  });
  res.json({ username: user.username });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.status(204).end();
});

router.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ username: req.user!.username });
});

export default router;
