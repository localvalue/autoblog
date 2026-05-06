import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  websiteUrl: text("website_url").notNull(),
  description: text("description"),
  niche: text("niche"),
  targetAudience: text("target_audience"),
  language: text("language").notNull().default("en"),
  status: text("status").notNull().default("pending"),
  // WordPress integration
  wordpressUrl: text("wordpress_url"),
  wordpressUsername: text("wordpress_username"),
  wordpressAppPassword: text("wordpress_app_password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
