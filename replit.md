# AutoSEO

Automated SEO content generation platform. Users enter a website URL, the system analyzes the business, generates keywords, creates a 30-day content plan, and writes full expert SEO articles targeting Google and AI search engines (ChatGPT, Perplexity). Includes WordPress publishing with AI-generated featured images.

## Run & Operate

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

**Required env vars:** `DATABASE_URL`, `SESSION_SECRET`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24 / TypeScript 5.9
- **Frontend**: React 19 + Vite 7, Tailwind CSS v4, shadcn/ui, wouter (routing), react-markdown + remark-gfm (article rendering), framer-motion
- **Backend**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (`gpt-5` for analysis/keywords/plan/articles, `gpt-image-1` for featured images)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (projects, keywords, content_plans, articles)
- `artifacts/api-server/src/routes/` — Express route handlers (projects, keywords, content_plans, articles, analytics, **wordpress**)
- `artifacts/auto-seo/src/pages/` — React pages (landing, projects, new-project, project-dashboard, articles-list, article-detail, keywords-list, content-plan, analytics)
- `artifacts/auto-seo/src/components/layout.tsx` — Sidebar + main layout
- `artifacts/auto-seo/src/components/wp-icon.tsx` — Custom WordPress SVG icon

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks + Zod schemas
- AI article generation runs server-side via OpenAI (avoids key exposure); articles stored in DB after generation
- All routes prefixed `/api/...`; frontend on `/`; shared reverse proxy routes by path
- Dark theme set as default (no light mode toggle) — Bloomberg terminal aesthetic
- `react-markdown` renders article content in article-detail page using `prose-dark` custom CSS class
- WordPress app passwords stored in DB; `wordpressAppPassword` is never returned to clients — only `wordpressConnected` (boolean) and `wordpressUrl`/`wordpressUsername`

## Product

- **Landing page**: Marketing hero with URL input → creates project directly
- **Projects**: List all SEO projects with status badges
- **Project Dashboard**: Stats + WordPress Integration panel (connect, test, schedule all)
- **Articles**: List with search/filter by status; generate new articles via AI; view, regenerate, delete
- **Article Detail**: Full markdown rendered article; "Publish to WordPress" button (generates AI image + creates WP post)
- **Keywords**: Keyword list with search intent badges, difficulty, priority scores
- **Content Plan**: 30-day calendar in weekly groups; generate articles directly from plan items
- **Analytics**: Global stats across all projects
- **WordPress**: Connect blog via Application Password; publish individual articles or schedule entire 30-day plan with AI featured images

## User preferences

- Dark mode UI (default, no toggle needed)
- No emojis in UI
- Professional, dense data surfaces — "Bloomberg terminal for content marketing"
- Teal/emerald primary accent color

## Gotchas

- Orval codegen overwrites `lib/api-client-react/src/generated/` — never hand-edit those files
- `lib/api-zod/src/index.ts` only exports from `./generated/api` (not `./generated/types`) to avoid duplicate export conflicts
- Article generation takes ~20-40s; UI shows loading state + toast
- WordPress publish generates a featured image via `gpt-image-1` — adds ~15-30s per article
- `pnpm add` auto-uses catalog pins from `pnpm-workspace.yaml`
- `wordpressAppPassword` stripped from all API responses in `projects.ts` `sanitize()` helper

## Pointers

- `.local/skills/pnpm-workspace/` — monorepo conventions
- `.local/skills/react-vite/` — frontend setup
- `.local/skills/database/` — DB schema changes
