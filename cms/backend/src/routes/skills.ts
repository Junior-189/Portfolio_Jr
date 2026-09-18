import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const skillSchema = z.object({
  name: z.string().min(1).max(120),
  years: z.number().int().min(0).max(60),
  level: z.number().int().min(0).max(100),
  desc: z.string().max(500),
  order: z.number().int().optional(),
});

router.get("/", async (_req, res) => {
  const skills = await prisma.skill.findMany({ orderBy: { order: "asc" } });
  res.json(skills);
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = skillSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });
  const skill = await prisma.skill.create({ data: parsed.data });
  res.status(201).json(skill);
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
  const parsed = skillSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });
  const skill = await prisma.skill.update({ where: { id }, data: parsed.data }).catch(() => null);
  if (!skill) return res.status(404).json({ error: "Not found." });
  res.json(skill);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
  await prisma.skill.delete({ where: { id } }).catch(() => null);
  res.status(204).end();
});

export default router;
