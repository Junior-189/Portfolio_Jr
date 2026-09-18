import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const urlOrEmpty = z.string().url().or(z.literal("")).optional();

const projectSchema = z.object({
  num: z.string().min(1).max(10),
  title: z.string().min(1).max(120),
  desc: z.string().max(600),
  stack: z.array(z.string().max(40)).max(20),
  githubUrl: urlOrEmpty,
  liveUrl: urlOrEmpty,
  order: z.number().int().optional(),
});

router.get("/", async (_req, res) => {
  const projects = await prisma.project.findMany({ orderBy: { order: "asc" } });
  res.json(projects);
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });
  const { githubUrl, liveUrl, ...rest } = parsed.data;
  const project = await prisma.project.create({ data: { ...rest, githubUrl: githubUrl || null, liveUrl: liveUrl || null } });
  res.status(201).json(project);
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
  const parsed = projectSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });
  const { githubUrl, liveUrl, ...rest } = parsed.data;
  const data = { ...rest, ...(githubUrl !== undefined && { githubUrl: githubUrl || null }), ...(liveUrl !== undefined && { liveUrl: liveUrl || null }) };
  const project = await prisma.project.update({ where: { id }, data }).catch(() => null);
  if (!project) return res.status(404).json({ error: "Not found." });
  res.json(project);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id." });
  await prisma.project.delete({ where: { id } }).catch(() => null);
  res.status(204).end();
});

export default router;
