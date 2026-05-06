import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const articlesTable = pgTable("articles", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  keyword: text("keyword").notNull(),
  content: text("content"),
  metaDescription: text("meta_description"),
  wordCount: integer("word_count"),
  status: text("status").notNull().default("draft"),
  language: text("language").notNull().default("en"),
  searchIntent: text("search_intent"),
  // WordPress publishing
  wordpressPostId: integer("wordpress_post_id"),
  wordpressPublishedAt: timestamp("wordpress_published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertArticleSchema = createInsertSchema(articlesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
