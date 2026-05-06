import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const keywordsTable = pgTable("keywords", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  searchIntent: text("search_intent").notNull().default("informational"),
  difficulty: text("difficulty").notNull().default("medium"),
  priority: integer("priority").notNull().default(5),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertKeywordSchema = createInsertSchema(keywordsTable).omit({ id: true, createdAt: true });
export type InsertKeyword = z.infer<typeof insertKeywordSchema>;
export type Keyword = typeof keywordsTable.$inferSelect;
