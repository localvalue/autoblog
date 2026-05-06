import { Router } from "express";
import { db } from "@workspace/db";
import { keywordsTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ListKeywordsParams, GenerateKeywordsParams } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// GET /projects/:id/keywords
router.get("/projects/:id/keywords", async (req, res) => {
  const parsed = ListKeywordsParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const keywords = await db.select().from(keywordsTable).where(eq(keywordsTable.projectId, parsed.data.id)).orderBy(keywordsTable.priority);
  res.json(keywords);
});

// POST /projects/:id/keywords (generate)
router.post("/projects/:id/keywords", async (req, res) => {
  const parsed = GenerateKeywordsParams.safeParse({ id: Number(req.params.id) });
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
    max_completion_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Generate 20 high-value SEO keywords for this business. Return a JSON array of objects with fields: keyword, searchIntent (informational|navigational|transactional|commercial), difficulty (easy|medium|hard), priority (1-10).
Business: ${project.name}
Website: ${project.websiteUrl}
Niche: ${project.niche ?? "General"}
Target audience: ${project.targetAudience ?? "General"}
Respond ONLY with a valid JSON array, no markdown.`,
      },
    ],
  });

  let keywordData: Array<{ keyword: string; searchIntent: string; difficulty: string; priority: number }> = [];
  try {
    const raw = completion.choices[0]?.message?.content ?? "[]";
    keywordData = JSON.parse(raw);
  } catch {
    req.log.error("Failed to parse AI keywords response");
  }

  if (keywordData.length === 0) {
    res.status(500).json({ error: "Failed to generate keywords" });
    return;
  }

  const inserted = await db.insert(keywordsTable).values(
    keywordData.map((k) => ({
      projectId: parsed.data.id,
      keyword: k.keyword ?? "SEO keyword",
      searchIntent: (["informational", "navigational", "transactional", "commercial"].includes(k.searchIntent) ? k.searchIntent : "informational") as "informational" | "navigational" | "transactional" | "commercial",
      difficulty: (["easy", "medium", "hard"].includes(k.difficulty) ? k.difficulty : "medium") as "easy" | "medium" | "hard",
      priority: Math.max(1, Math.min(10, k.priority ?? 5)),
      used: false,
    }))
  ).returning();

  res.status(201).json(inserted);
});

export default router;
