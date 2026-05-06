import { db } from "@workspace/db";
import { projectsTable, keywordsTable, contentPlansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger.js";

type Project = {
  id: number;
  name: string;
  websiteUrl: string;
  niche: string | null;
  targetAudience: string | null;
  language: string;
};

async function analyzeWebsite(project: Project) {
  await db
    .update(projectsTable)
    .set({ status: "analyzing", updatedAt: new Date() })
    .where(eq(projectsTable.id, project.id));

  const completion = await openai.chat.completions.create({
    model: "gpt-5",
    max_completion_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Analyze this website and provide a JSON response with fields: niche (string), targetAudience (string), description (string).
Website URL: ${project.websiteUrl}
Website name: ${project.name}
Respond ONLY with valid JSON, no markdown.`,
      },
    ],
  });

  let analysis = {
    niche: "General",
    targetAudience: "General audience",
    description: project.name,
  };
  try {
    const raw = completion.choices[0]?.message?.content ?? "{}";
    analysis = JSON.parse(raw);
  } catch {
    logger.error("Failed to parse AI analysis response");
  }

  const [updated] = await db
    .update(projectsTable)
    .set({
      niche: analysis.niche,
      targetAudience: analysis.targetAudience,
      description: analysis.description,
      updatedAt: new Date(),
    })
    .where(eq(projectsTable.id, project.id))
    .returning();

  return updated;
}

async function generateKeywords(project: Project) {
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

  let keywordData: Array<{
    keyword: string;
    searchIntent: string;
    difficulty: string;
    priority: number;
  }> = [];
  try {
    const raw = completion.choices[0]?.message?.content ?? "[]";
    keywordData = JSON.parse(raw);
  } catch {
    logger.error("Failed to parse AI keywords response");
  }

  if (keywordData.length === 0) return;

  await db.insert(keywordsTable).values(
    keywordData.map((k) => ({
      projectId: project.id,
      keyword: k.keyword ?? "SEO keyword",
      searchIntent: (
        ["informational", "navigational", "transactional", "commercial"].includes(k.searchIntent)
          ? k.searchIntent
          : "informational"
      ) as "informational" | "navigational" | "transactional" | "commercial",
      difficulty: (
        ["easy", "medium", "hard"].includes(k.difficulty) ? k.difficulty : "medium"
      ) as "easy" | "medium" | "hard",
      priority: Math.max(1, Math.min(10, k.priority ?? 5)),
      used: false,
    }))
  );
}

async function generateContentPlan(project: Project) {
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

  let planData: Array<{
    dayNumber: number;
    title: string;
    keyword: string;
    searchIntent: string;
  }> = [];
  try {
    const raw = completion.choices[0]?.message?.content ?? "[]";
    planData = JSON.parse(raw);
  } catch {
    logger.error("Failed to parse AI content plan response");
  }

  if (planData.length === 0) return;

  await db
    .delete(contentPlansTable)
    .where(eq(contentPlansTable.projectId, project.id));

  const now = new Date();
  await db.insert(contentPlansTable).values(
    planData.map((item) => {
      const scheduled = new Date(now);
      scheduled.setDate(scheduled.getDate() + (item.dayNumber - 1));
      return {
        projectId: project.id,
        dayNumber: item.dayNumber ?? 1,
        title: item.title ?? "SEO Article",
        keyword: item.keyword ?? "seo",
        searchIntent: (
          ["informational", "navigational", "transactional", "commercial"].includes(item.searchIntent)
            ? item.searchIntent
            : "informational"
        ) as "informational" | "navigational" | "transactional" | "commercial",
        scheduledDate: scheduled,
      };
    })
  );
}

export async function runSetupPipeline(projectId: number): Promise<void> {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    logger.error({ projectId }, "Project not found for setup pipeline");
    return;
  }

  try {
    // Step 1: Analyze website
    const analyzed = await analyzeWebsite(project);
    const enriched = { ...project, ...analyzed };

    // Step 2: Generate keywords (uses enriched niche/audience)
    await generateKeywords(enriched);

    // Step 3: Generate content plan
    await generateContentPlan(enriched);

    // Mark as active
    await db
      .update(projectsTable)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));

    logger.info({ projectId }, "Setup pipeline complete");
  } catch (err) {
    logger.error({ err, projectId }, "Setup pipeline failed");
    await db
      .update(projectsTable)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));
  }
}
