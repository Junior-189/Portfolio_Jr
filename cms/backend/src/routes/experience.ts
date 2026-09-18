import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const experienceSchema = z.object({
  year: z.string().min(1).max(60),
  role: z.string().min(1).max(120),
  company: z.string().min(1).max(150),
  desc: z.string().max(800),
  order: z.number().int().optional(),
});

router.get("/", async (_req, res) => {
  const experience = await prisma.experience.findMany({ orderBy: { order: "asc" } });
  res.json(experience);
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = experienceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });
  const entry = await prisma.experience.create({ data: parsed.data });
  res.status(201).json(entry);
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
  const parsed = experienceSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });
  const entry = await prisma.experience.update({ where: { id }, data: parsed.data }).catch(() => null);
  if (!entry) return res.status(404).json({ error: "Not found." });
  res.json(entry);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
  await prisma.experience.delete({ where: { id } }).catch(() => null);
  res.status(204).end();
});

export default router;
