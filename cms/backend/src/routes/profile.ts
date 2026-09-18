import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const profileSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  githubUrl: z.string().url().max(300),
  linkedinUrl: z.string().url().max(300),
  footerNote: z.string().max(200),
});

// Single-row content — there is only ever one site profile.
router.get("/", async (_req, res) => {
  const profile = await prisma.profile.findFirst();
  if (!profile) return res.status(404).json({ error: "Profile not seeded yet — run the seed script." });
  res.json(profile);
});

router.put("/", requireAuth, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });
  const existing = await prisma.profile.findFirst();
  const profile = existing
    ? await prisma.profile.update({ where: { id: existing.id }, data: parsed.data })
    : await prisma.profile.create({ data: parsed.data });
  res.json(profile);
});

export default router;
