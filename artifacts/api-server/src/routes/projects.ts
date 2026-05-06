import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  DeleteProjectParams,
  AnalyzeWebsiteParams,
  UpdateProjectParams,
} from "@workspace/api-zod";
import { runSetupPipeline } from "./pipeline.js";

const router = Router();

// Strip the app password before returning to clients; add derived wordpressConnected
type RawProject = typeof projectsTable.$inferSelect;
function sanitize(p: RawProject) {
  const { wordpressAppPassword, ...rest } = p;
  return { ...rest, wordpressConnected: !!wordpressAppPassword };
}

// GET /projects
router.get("/projects", async (req, res) => {
  const projects = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
  res.json(projects.map(sanitize));
});

// POST /projects — create and immediately kick off the setup pipeline
router.post("/projects", async (req, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, websiteUrl, language = "en" } = parsed.data;
  const [project] = await db
    .insert(projectsTable)
    .values({ name, websiteUrl, language, status: "pending" })
    .returning();

  res.status(201).json(sanitize(project));

  // Fire the full setup pipeline in the background — does not block the response
  setImmediate(() => {
    runSetupPipeline(project.id).catch((err) => {
      req.log.error({ err, projectId: project.id }, "Background setup pipeline failed");
    });
  });
});

// GET /projects/:id
router.get("/projects/:id", async (req, res) => {
  const parsed = GetProjectParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, parsed.data.id));
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(sanitize(project));
});

// PATCH /projects/:id
router.patch("/projects/:id", async (req, res) => {
  const params = UpdateProjectParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateProjectBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const [project] = await db
    .update(projectsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(sanitize(project));
});

// DELETE /projects/:id
router.delete("/projects/:id", async (req, res) => {
  const parsed = DeleteProjectParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await db.delete(projectsTable).where(eq(projectsTable.id, parsed.data.id));
  res.status(204).send();
});

// POST /projects/:id/analyze — manual re-run of the full setup pipeline
router.post("/projects/:id/analyze", async (req, res) => {
  const parsed = AnalyzeWebsiteParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, parsed.data.id));
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({ message: "Setup pipeline started" });

  setImmediate(() => {
    runSetupPipeline(project.id).catch((err) => {
      req.log.error({ err, projectId: project.id }, "Manual pipeline re-run failed");
    });
  });
});

export default router;
