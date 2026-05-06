import { Router } from "express";
import { db } from "@workspace/db";
import { contentPlansTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetContentPlanParams, GenerateContentPlanParams } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// GET /projects/:id/content-plan
router.get("/projects/:id/content-plan", async (req, res) => {
  const parsed = GetContentPlanParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const items = await db.select().from(contentPlansTable).where(eq(contentPlansTable.projectId, parsed.data.id)).orderBy(contentPlansTable.dayNumber);
  res.json(items);
});

// POST /projects/:id/content-plan (generate)
router.post("/projects/:id/content-plan", async (req, res) => {
  const parsed = GenerateContentPlanParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, parsed.data.id));
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-5",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Create a 30-day SEO content plan for this business. Return a JSON array of 30 objects with fields: dayNumber (1-30), title (article title), keyword (target keyword), searchIntent (informational|navigational|transactional|commercial).
Business: ${project.name}
Website: ${project.websiteUrl}
Niche: ${project.niche ?? "General"}
Target audience: ${project.targetAudience ?? "General"}
Mix content types: how-to guides, listicles, comparisons, case studies, tutorials, product reviews.
Target both Google and AI search engines (ChatGPT, Perplexity). Include long-tail keywords.
Respond ONLY with a valid JSON array of 30 items, no markdown.`,
      },
    ],
  });

  let planData: Array<{ dayNumber: number; title: string; keyword: string; searchIntent: string }> = [];
  try {
    const raw = completion.choices[0]?.message?.content ?? "[]";
    planData = JSON.parse(raw);
  } catch {
    req.log.error("Failed to parse AI content plan response");
  }

  if (planData.length === 0) {
    res.status(500).json({ error: "Failed to generate content plan" });
    return;
  }

  // Delete existing plan
  await db.delete(contentPlansTable).where(eq(contentPlansTable.projectId, parsed.data.id));

  const now = new Date();
  const inserted = await db.insert(contentPlansTable).values(
    planData.map((item) => {
      const scheduled = new Date(now);
      scheduled.setDate(scheduled.getDate() + (item.dayNumber - 1));
      return {
        projectId: parsed.data.id,
        dayNumber: item.dayNumber ?? 1,
        title: item.title ?? "SEO Article",
        keyword: item.keyword ?? "seo",
        searchIntent: (["informational", "navigational", "transactional", "commercial"].includes(item.searchIntent) ? item.searchIntent : "informational") as "informational" | "navigational" | "transactional" | "commercial",
        scheduledDate: scheduled,
      };
    })
  ).returning();

  res.status(201).json(inserted);
});

export default router;
