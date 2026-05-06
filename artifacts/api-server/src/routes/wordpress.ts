import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, articlesTable, contentPlansTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { marked } from "marked";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server";

const router = Router();

// ── helpers ────────────────────────────────────────────────────────────

function basicAuth(username: string, password: string): string {
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

async function getProject(id: number) {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  return project ?? null;
}

async function wpRequest(
  base: string,
  path: string,
  username: string,
  appPassword: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${base.replace(/\/$/, "")}/wp-json/wp/v2${path}`;
  const headers: Record<string, string> = {
    Authorization: basicAuth(username, appPassword),
    ...(options.headers as Record<string, string> ?? {}),
  };
  return fetch(url, { ...options, headers });
}

async function uploadImageToWP(
  base: string,
  username: string,
  appPassword: string,
  imageBuffer: Buffer,
  filename: string
): Promise<number | null> {
  const blob = new Blob([imageBuffer], { type: "image/png" });
  const form = new FormData();
  form.append("file", blob, filename);

  const res = await wpRequest(base, "/media", username, appPassword, {
    method: "POST",
    body: form,
  });

  if (!res.ok) return null;
  const data = await res.json() as { id?: number };
  return data.id ?? null;
}

async function generateFeaturedImage(title: string): Promise<Buffer | null> {
  try {
    return await generateImageBuffer(
      `Professional blog featured image for an article titled "${title}". Clean, modern, high quality, photorealistic. No text overlay.`,
      "1024x1024"
    );
  } catch {
    return null;
  }
}

// ── POST /projects/:id/wordpress/connect ────────────────────────────────

router.post("/:id/wordpress/connect", async (req, res) => {
  const id = Number(req.params.id);
  const { wordpressUrl, wordpressUsername, wordpressAppPassword } = req.body as {
    wordpressUrl: string;
    wordpressUsername: string;
    wordpressAppPassword: string;
  };

  if (!wordpressUrl || !wordpressUsername || !wordpressAppPassword) {
    res.status(400).json({ error: "All three WordPress fields are required" });
    return;
  }

  let siteTitle: string | null = null;
  let connected = false;
  let errorMsg: string | null = null;

  try {
    const testRes = await wpRequest(wordpressUrl, "/users/me", wordpressUsername, wordpressAppPassword, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (testRes.ok) {
      connected = true;
      try {
        const siteRes = await fetch(`${wordpressUrl.replace(/\/$/, "")}/wp-json`);
        if (siteRes.ok) {
          const siteData = await siteRes.json() as { name?: string };
          siteTitle = siteData.name ?? null;
        }
      } catch { /* non-fatal */ }

      await db.update(projectsTable)
        .set({
          wordpressUrl: wordpressUrl.replace(/\/$/, ""),
          wordpressUsername,
          wordpressAppPassword,
          updatedAt: new Date(),
        })
        .where(eq(projectsTable.id, id));
    } else {
      const body = await testRes.text();
      errorMsg = `WordPress returned ${testRes.status}: ${body.slice(0, 200)}`;
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Connection failed";
  }

  res.json({ connected, siteTitle, error: errorMsg });
});

// ── POST /projects/:projectId/articles/:articleId/wordpress/publish ─────

router.post("/:projectId/articles/:articleId/wordpress/publish", async (req, res) => {
  const projectId = Number(req.params.projectId);
  const articleId = Number(req.params.articleId);
  const { scheduledDate } = (req.body ?? {}) as { scheduledDate?: string };

  const project = await getProject(projectId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (!project.wordpressUrl || !project.wordpressUsername || !project.wordpressAppPassword) {
    res.status(400).json({ error: "WordPress not connected. Connect via the dashboard first." });
    return;
  }

  const [article] = await db.select().from(articlesTable)
    .where(and(eq(articlesTable.id, articleId), eq(articlesTable.projectId, projectId)));
  if (!article) { res.status(404).json({ error: "Article not found" }); return; }
  if (!article.content) { res.status(400).json({ error: "Article has no content. Generate it first." }); return; }

  const { wordpressUrl, wordpressUsername, wordpressAppPassword } = project;

  // 1. Generate & upload featured image
  let featuredMediaId: number | null = null;
  const imgBuffer = await generateFeaturedImage(article.title);
  if (imgBuffer) {
    const filename = `${article.title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 60)}.png`;
    featuredMediaId = await uploadImageToWP(wordpressUrl, wordpressUsername, wordpressAppPassword, imgBuffer, filename);
  }

  // 2. Convert markdown → HTML
  const htmlContent = await marked(article.content);

  // 3. Post to WordPress
  const postDate = scheduledDate ? new Date(scheduledDate) : null;
  const postStatus = postDate && postDate > new Date() ? "future" : "publish";

  const postBody: Record<string, unknown> = {
    title: article.title,
    content: htmlContent,
    status: postStatus,
    excerpt: article.metaDescription ?? "",
  };
  if (featuredMediaId) postBody.featured_media = featuredMediaId;
  if (postDate) postBody.date = postDate.toISOString().replace("Z", "");

  const postRes = await wpRequest(wordpressUrl, "/posts", wordpressUsername, wordpressAppPassword, {
    method: "POST",
    body: JSON.stringify(postBody),
    headers: { "Content-Type": "application/json" },
  });

  if (!postRes.ok) {
    const errBody = await postRes.text();
    res.status(502).json({ error: `WordPress returned ${postRes.status}: ${errBody.slice(0, 300)}` });
    return;
  }

  const postData = await postRes.json() as { id?: number };

  const [updated] = await db.update(articlesTable)
    .set({
      wordpressPostId: postData.id ?? null,
      wordpressPublishedAt: new Date(),
      status: "published",
      updatedAt: new Date(),
    })
    .where(eq(articlesTable.id, articleId))
    .returning();

  res.json(updated);
});

// ── POST /projects/:id/wordpress/schedule-all ────────────────────────────

router.post("/:id/wordpress/schedule-all", async (req, res) => {
  const id = Number(req.params.id);

  const project = await getProject(id);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (!project.wordpressUrl || !project.wordpressUsername || !project.wordpressAppPassword) {
    res.status(400).json({ error: "WordPress not connected." });
    return;
  }

  const { wordpressUrl, wordpressUsername, wordpressAppPassword } = project;
  const planItems = await db.select().from(contentPlansTable).where(eq(contentPlansTable.projectId, id));

  let scheduled = 0;
  let skipped = 0;
  let errors = 0;
  const today = new Date();

  for (const item of planItems) {
    if (!item.articleId) { skipped++; continue; }

    const [article] = await db.select().from(articlesTable)
      .where(and(eq(articlesTable.id, item.articleId), eq(articlesTable.projectId, id)));

    if (!article || !article.content) { skipped++; continue; }
    if (article.wordpressPostId) { skipped++; continue; }

    const scheduleDate = new Date(today);
    scheduleDate.setDate(today.getDate() + (item.dayNumber - 1));
    scheduleDate.setHours(9, 0, 0, 0);

    const htmlContent = await marked(article.content);

    let featuredMediaId: number | null = null;
    const imgBuffer = await generateFeaturedImage(article.title);
    if (imgBuffer) {
      featuredMediaId = await uploadImageToWP(
        wordpressUrl, wordpressUsername, wordpressAppPassword,
        imgBuffer, `post-${article.id}.png`
      );
    }

    const postStatus = scheduleDate > new Date() ? "future" : "publish";
    const postBody: Record<string, unknown> = {
      title: article.title,
      content: htmlContent,
      status: postStatus,
      excerpt: article.metaDescription ?? "",
      date: scheduleDate.toISOString().replace("Z", ""),
    };
    if (featuredMediaId) postBody.featured_media = featuredMediaId;

    try {
      const postRes = await wpRequest(wordpressUrl, "/posts", wordpressUsername, wordpressAppPassword, {
        method: "POST",
        body: JSON.stringify(postBody),
        headers: { "Content-Type": "application/json" },
      });
      if (postRes.ok) {
        const postData = await postRes.json() as { id?: number };
        await db.update(articlesTable)
          .set({
            wordpressPostId: postData.id ?? null,
            wordpressPublishedAt: new Date(),
            status: "published",
            updatedAt: new Date(),
          })
          .where(eq(articlesTable.id, article.id));
        scheduled++;
      } else {
        errors++;
      }
    } catch {
      errors++;
    }
  }

  res.json({ scheduled, skipped, errors });
});

export default router;
