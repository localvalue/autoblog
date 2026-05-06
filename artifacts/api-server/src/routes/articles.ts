import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateArticleBody,
  UpdateArticleBody,
  ListArticlesParams,
  ListArticlesQueryParams,
  GetArticleParams,
  UpdateArticleParams,
  DeleteArticleParams,
  RegenerateArticleParams,
  CreateArticleParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

async function generateArticleContent(
  project: { name: string; websiteUrl: string; niche: string | null; targetAudience: string | null; language: string },
  title: string,
  keyword: string,
  searchIntent: string | null | undefined,
  language: string
): Promise<{ content: string; metaDescription: string; wordCount: number }> {
  const completion = await openai.chat.completions.create({
    model: "gpt-5",
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content: `You are an expert SEO content writer. Write comprehensive, authoritative articles that rank on Google AND get recommended by AI search engines like ChatGPT and Perplexity. Your articles should be well-structured with H2/H3 headings, include a key takeaways section, use markdown formatting, and be between 1500-3000 words. Write in ${language === "en" ? "English" : language}.`,
      },
      {
        role: "user",
        content: `Write a comprehensive SEO article for this business:
Business: ${project.name}
Website: ${project.websiteUrl}
Niche: ${project.niche ?? "General"}
Target audience: ${project.targetAudience ?? "General audience"}
Article title: ${title}
Target keyword: "${keyword}"
Search intent: ${searchIntent ?? "informational"}

Requirements:
- Start with a compelling introduction that hooks the reader and addresses their pain point
- Include a "Key Takeaways" section near the top
- Use H2 and H3 subheadings throughout
- Naturally incorporate the target keyword and related terms
- Include actionable advice and specific examples
- End with a conclusion and clear next steps
- Write in markdown format
- The content should help this business get more customers

Also provide a meta description (150-160 characters) at the end in this format:
META_DESCRIPTION: [your meta description here]`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const metaMatch = raw.match(/META_DESCRIPTION:\s*(.+)$/m);
  const metaDescription = metaMatch ? metaMatch[1].trim() : `${title} - Expert guide for ${project.name}`;
  const content = raw.replace(/META_DESCRIPTION:.*$/m, "").trim();
  const wordCount = content.split(/\s+/).length;

  return { content, metaDescription, wordCount };
}

// GET /projects/:projectId/articles
router.get("/projects/:projectId/articles", async (req, res) => {
  const params = ListArticlesParams.safeParse({ projectId: Number(req.params.projectId) });
  const query = ListArticlesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  let where = eq(articlesTable.projectId, params.data.projectId);
  if (query.success && query.data.status) {
    where = and(where, eq(articlesTable.status, query.data.status)) as typeof where;
  }

  const articles = await db.select().from(articlesTable).where(where).orderBy(articlesTable.createdAt);
  res.json(articles);
});

// POST /projects/:projectId/articles
router.post("/projects/:projectId/articles", async (req, res) => {
  const params = CreateArticleParams.safeParse({ projectId: Number(req.params.projectId) });
  const body = CreateArticleBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const lang = body.data.language ?? project.language ?? "en";

  // Insert as generating first
  const [article] = await db.insert(articlesTable).values({
    projectId: params.data.projectId,
    title: body.data.title,
    keyword: body.data.keyword,
    searchIntent: body.data.searchIntent ?? null,
    language: lang,
    status: "generating",
  }).returning();

  // Generate content asynchronously, update after
  try {
    const generated = await generateArticleContent(project, body.data.title, body.data.keyword, body.data.searchIntent, lang);
    const [updated] = await db.update(articlesTable).set({
      content: generated.content,
      metaDescription: generated.metaDescription,
      wordCount: generated.wordCount,
      status: "published",
      updatedAt: new Date(),
    }).where(eq(articlesTable.id, article.id)).returning();
    res.status(201).json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to generate article");
    await db.update(articlesTable).set({ status: "failed", updatedAt: new Date() }).where(eq(articlesTable.id, article.id));
    res.status(201).json({ ...article, status: "failed" });
  }
});

// GET /projects/:projectId/articles/:articleId
router.get("/projects/:projectId/articles/:articleId", async (req, res) => {
  const parsed = GetArticleParams.safeParse({
    projectId: Number(req.params.projectId),
    articleId: Number(req.params.articleId),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid IDs" });
    return;
  }

  const [article] = await db.select().from(articlesTable).where(
    and(eq(articlesTable.id, parsed.data.articleId), eq(articlesTable.projectId, parsed.data.projectId))
  );
  if (!article) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(article);
});

// PATCH /projects/:projectId/articles/:articleId
router.patch("/projects/:projectId/articles/:articleId", async (req, res) => {
  const params = UpdateArticleParams.safeParse({
    projectId: Number(req.params.projectId),
    articleId: Number(req.params.articleId),
  });
  const body = UpdateArticleBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const [article] = await db.update(articlesTable).set({
    ...body.data,
    updatedAt: new Date(),
  }).where(
    and(eq(articlesTable.id, params.data.articleId), eq(articlesTable.projectId, params.data.projectId))
  ).returning();

  if (!article) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(article);
});

// DELETE /projects/:projectId/articles/:articleId
router.delete("/projects/:projectId/articles/:articleId", async (req, res) => {
  const parsed = DeleteArticleParams.safeParse({
    projectId: Number(req.params.projectId),
    articleId: Number(req.params.articleId),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid IDs" });
    return;
  }

  await db.delete(articlesTable).where(
    and(eq(articlesTable.id, parsed.data.articleId), eq(articlesTable.projectId, parsed.data.projectId))
  );
  res.status(204).send();
});

// POST /projects/:projectId/articles/:articleId/regenerate
router.post("/projects/:projectId/articles/:articleId/regenerate", async (req, res) => {
  const parsed = RegenerateArticleParams.safeParse({
    projectId: Number(req.params.projectId),
    articleId: Number(req.params.articleId),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid IDs" });
    return;
  }

  const [article] = await db.select().from(articlesTable).where(
    and(eq(articlesTable.id, parsed.data.articleId), eq(articlesTable.projectId, parsed.data.projectId))
  );
  if (!article) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, article.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db.update(articlesTable).set({ status: "generating", updatedAt: new Date() }).where(eq(articlesTable.id, article.id));

  try {
    const generated = await generateArticleContent(project, article.title, article.keyword, article.searchIntent, article.language);
    const [updated] = await db.update(articlesTable).set({
      content: generated.content,
      metaDescription: generated.metaDescription,
      wordCount: generated.wordCount,
      status: "published",
      updatedAt: new Date(),
    }).where(eq(articlesTable.id, article.id)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to regenerate article");
    await db.update(articlesTable).set({ status: "failed", updatedAt: new Date() }).where(eq(articlesTable.id, article.id));
    res.status(500).json({ error: "Generation failed" });
  }
});

export default router;
