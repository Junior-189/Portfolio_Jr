import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const statSchema = z.object({ value: z.string().max(20), label: z.string().max(60) });
const bioSchema = z.object({
  heading: z.string().min(1).max(200),
  paragraph1: z.string().max(1000),
  paragraph2: z.string().max(1000),
  stats: z.array(statSchema).max(8),
});

// Single-row content — the About section only ever has one bio.
router.get("/", async (_req, res) => {
  const bio = await prisma.bio.findFirst();
  if (!bio) return res.status(404).json({ error: "Bio not seeded yet — run the seed script." });
  res.json(bio);
});

router.put("/", requireAuth, async (req, res) => {
  const parsed = bioSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });
  const existing = await prisma.bio.findFirst();
  const bio = existing
    ? await prisma.bio.update({ where: { id: existing.id }, data: parsed.data })
    : await prisma.bio.create({ data: parsed.data });
  res.json(bio);
});

export default router;
