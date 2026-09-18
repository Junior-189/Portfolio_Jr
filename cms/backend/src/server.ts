import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRouter from "./routes/auth";
import skillsRouter from "./routes/skills";
import projectsRouter from "./routes/projects";
import experienceRouter from "./routes/experience";
import bioRouter from "./routes/bio";
import profileRouter from "./routes/profile";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "100kb" })); // small limit — this API only ever receives short text fields

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/experience", experienceRouter);
app.use("/api/bio", bioRouter);
app.use("/api/profile", profileRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found." }));

// Centralised error handler — keeps stack traces out of responses.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`Portfolio CMS backend listening on http://localhost:${PORT}`);
});
