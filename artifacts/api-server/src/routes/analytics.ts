import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, keywordsTable, contentPlansTable, projectsTable } from "@workspace/db";
import { eq, count, sum, sql } from "drizzle-orm";
import { GetProjectAnalyticsParams } from "@workspace/api-zod";

const router = Router();

// GET /projects/:id/analytics
router.get("/projects/:id/analytics", async (req, res) => {
  const parsed = GetProjectAnalyticsParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const projectId = parsed.data.id;

  const [articleStats] = await db
    .select({
      total: count(),
      totalWordCount: sum(articlesTable.wordCount),
    })
    .from(articlesTable)
    .where(eq(articlesTable.projectId, projectId));

  const [publishedStats] = await db
    .select({ total: count() })
    .from(articlesTable)
    .where(eq(articlesTable.projectId, projectId));

  const articlesByStatus = await db
    .select({ status: articlesTable.status, total: count() })
    .from(articlesTable)
    .where(eq(articlesTable.projectId, projectId))
    .groupBy(articlesTable.status);

  const published = articlesByStatus.find((s) => s.status === "published")?.total ?? 0;
  const draft = articlesByStatus.find((s) => s.status === "draft")?.total ?? 0;

  const [keywordStats] = await db
    .select({ total: count() })
    .from(keywordsTable)
    .where(eq(keywordsTable.projectId, projectId));

  const [planStats] = await db
    .select({ total: count() })
    .from(contentPlansTable)
    .where(eq(contentPlansTable.projectId, projectId));

  const planWithArticles = await db
    .select({ total: count() })
    .from(contentPlansTable)
    .where(eq(contentPlansTable.projectId, projectId));

  const planTotal = Number(planStats?.total ?? 0);
  const planDone = planWithArticles.filter((p) => p).length ?? 0;
  const planProgress = planTotal > 0 ? Math.round((planDone / planTotal) * 100) : 0;

  const recentArticles = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.projectId, projectId))
    .orderBy(sql`${articlesTable.createdAt} desc`)
    .limit(5);

  res.json({
    totalArticles: Number(articleStats?.total ?? 0),
    publishedArticles: Number(published),
    draftArticles: Number(draft),
    totalWordCount: Number(articleStats?.totalWordCount ?? 0),
    keywordsCount: Number(keywordStats?.total ?? 0),
    contentPlanProgress: planProgress,
    recentArticles,
  });
});

// GET /analytics/summary
router.get("/analytics/summary", async (req, res) => {
  const [projectStats] = await db.select({ total: count() }).from(projectsTable);
  const [activeStats] = await db
    .select({ total: count() })
    .from(projectsTable)
    .where(eq(projectsTable.status, "active"));

  const [articleStats] = await db
    .select({ total: count(), wordCount: sum(articlesTable.wordCount) })
    .from(articlesTable);

  const [publishedStats] = await db
    .select({ total: count() })
    .from(articlesTable)
    .where(eq(articlesTable.status, "published"));

  res.json({
    totalProjects: Number(projectStats?.total ?? 0),
    totalArticles: Number(articleStats?.total ?? 0),
    totalWordCount: Number(articleStats?.wordCount ?? 0),
    publishedArticles: Number(publishedStats?.total ?? 0),
    activeProjects: Number(activeStats?.total ?? 0),
  });
});

export default router;
