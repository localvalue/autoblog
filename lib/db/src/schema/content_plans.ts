import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const contentPlansTable = pgTable("content_plans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  title: text("title").notNull(),
  keyword: text("keyword").notNull(),
  searchIntent: text("search_intent").notNull().default("informational"),
  articleId: integer("article_id"),
  scheduledDate: timestamp("scheduled_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContentPlanSchema = createInsertSchema(contentPlansTable).omit({ id: true, createdAt: true });
export type InsertContentPlan = z.infer<typeof insertContentPlanSchema>;
export type ContentPlan = typeof contentPlansTable.$inferSelect;
