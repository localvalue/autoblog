import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  useGetProject, getGetProjectQueryKey,
  useGetProjectAnalytics, getGetProjectAnalyticsQueryKey,
  useAnalyzeWebsite,
  useConnectWordPress,
  useScheduleAllToWordPress,
  getListKeywordsQueryKey,
  getGetContentPlanQueryKey,
  getListArticlesQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Globe, Brain, Key, Calendar, FileText, TrendingUp,
  BarChart3, CheckCircle2, Loader2, ArrowRight, Plus, Zap,
  Link2, Link2Off, Send,
} from "lucide-react";
import { WpIcon } from "@/components/wp-icon";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: React.ElementType; sub?: string }) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold stat-number text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function SetupStep({
  icon: Icon,
  label,
  description,
  done,
  active,
  index,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  done: boolean;
  active: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-300 ${
        done
          ? "border-primary/30 bg-primary/5"
          : active
          ? "border-blue-500/40 bg-blue-500/5"
          : "border-border bg-card/50 opacity-50"
      }`}
    >
      <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5 ${
        done ? "bg-primary/20" : active ? "bg-blue-500/20" : "bg-muted"
      }`}>
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : active ? (
          <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
        ) : (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-sm font-medium ${done ? "text-primary" : active ? "text-blue-400" : "text-muted-foreground"}`}>
            {label}
          </span>
          {done && <span className="text-xs text-primary/70">Done</span>}
          {active && !done && <span className="text-xs text-blue-400/70">Running...</span>}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span className="text-xs font-mono text-muted-foreground/40 shrink-0 mt-1">
        {String(index + 1).padStart(2, "0")}
      </span>
    </motion.div>
  );
}

function WordPressPanel({ projectId, project, onRefresh }: {
  projectId: number;
  project: { wordpressConnected?: boolean | null; wordpressUrl?: string | null; wordpressUsername?: string | null };
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(!project.wordpressConnected);
  const [wpUrl, setWpUrl] = useState(project.wordpressUrl ?? "");
  const [wpUser, setWpUser] = useState(project.wordpressUsername ?? "");
  const [wpPass, setWpPass] = useState("");

  const connectWP = useConnectWordPress();
  const scheduleAll = useScheduleAllToWordPress();

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    connectWP.mutate(
      {
        id: projectId,
        data: { wordpressUrl: wpUrl, wordpressUsername: wpUser, wordpressAppPassword: wpPass },
      },
      {
        onSuccess: (result) => {
          if (result.connected) {
            toast({
              title: "WordPress connected",
              description: result.siteTitle ? `Connected to "${result.siteTitle}"` : "Connection successful",
            });
            setExpanded(false);
            onRefresh();
          } else {
            toast({
              title: "Connection failed",
              description: result.error ?? "Could not connect to WordPress",
              variant: "destructive",
            });
          }
        },
        onError: () => {
          toast({ title: "Connection failed", variant: "destructive" });
        },
      }
    );
  }

  function handleScheduleAll() {
    toast({ title: "Scheduling posts...", description: "This may take a few minutes while images are generated." });
    scheduleAll.mutate(
      { id: projectId },
      {
        onSuccess: (result) => {
          toast({
            title: "Schedule complete",
            description: `${result.scheduled} posts scheduled, ${result.skipped} skipped, ${result.errors} errors`,
          });
          onRefresh();
        },
        onError: () => {
          toast({ title: "Scheduling failed", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-8">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 bg-card cursor-pointer hover:bg-card/80 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[#21759b]/10">
            <WpIcon className="h-4 w-4 text-[#21759b]" />
          </div>
          <div>
            <p className="text-sm font-medium">WordPress Integration</p>
            <p className="text-xs text-muted-foreground">
              {project.wordpressConnected
                ? `Connected to ${project.wordpressUrl ?? "WordPress"}`
                : "Publish articles directly to your WordPress blog"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project.wordpressConnected ? (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 gap-1">
              <Link2 className="h-3 w-3" /> Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Link2Off className="h-3 w-3" /> Not connected
            </Badge>
          )}
        </div>
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="wp-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 border-t border-border bg-background/50 space-y-5">
              {/* Credentials form */}
              <form onSubmit={handleConnect} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Site URL</Label>
                  <Input
                    placeholder="https://myblog.com"
                    value={wpUrl}
                    onChange={(e) => setWpUrl(e.target.value)}
                    className="text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Username</Label>
                  <Input
                    placeholder="admin"
                    value={wpUser}
                    onChange={(e) => setWpUser(e.target.value)}
                    className="text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Application Password</Label>
                  <Input
                    type="password"
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={wpPass}
                    onChange={(e) => setWpPass(e.target.value)}
                    className="text-sm"
                    required
                  />
                </div>
                <div className="md:col-span-3 flex items-center gap-3">
                  <Button type="submit" size="sm" disabled={connectWP.isPending} className="bg-[#21759b] hover:bg-[#1a5e7a] text-white border-0">
                    {connectWP.isPending ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Testing connection...</>
                    ) : (
                      <><Link2 className="h-3.5 w-3.5 mr-1.5" />{project.wordpressConnected ? "Update connection" : "Connect WordPress"}</>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Generate an Application Password in WordPress under{" "}
                    <span className="font-medium text-foreground">Users &rarr; Profile &rarr; Application Passwords</span>
                  </p>
                </div>
              </form>

              {/* Schedule all button — only when connected */}
              {project.wordpressConnected && (
                <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Schedule entire content plan</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Publishes all generated articles as scheduled posts with AI-generated featured images, spread across 30 days.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleScheduleAll}
                    disabled={scheduleAll.isPending}
                    className="shrink-0"
                  >
                    {scheduleAll.isPending ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Scheduling...</>
                    ) : (
                      <><Send className="h-3.5 w-3.5 mr-1.5" />Schedule All Posts</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: {
      enabled: !!projectId,
      queryKey: getGetProjectQueryKey(projectId),
      refetchInterval: (query) => {
        const status = (query.state.data as { status?: string } | undefined)?.status;
        return status === "pending" || status === "analyzing" ? 2500 : false;
      },
    },
  });

  const { data: analytics } = useGetProjectAnalytics(projectId, {
    query: {
      enabled: !!projectId,
      queryKey: getGetProjectAnalyticsQueryKey(projectId),
      refetchInterval: (query) => {
        const status = project?.status;
        return status === "pending" || status === "analyzing" ? 2500 : false;
      },
    },
  });

  const analyzeWebsite = useAnalyzeWebsite();

  const setting = project?.status === "pending" || project?.status === "analyzing";

  // Step completion tracking
  const step1Done = !!project?.niche;
  const step2Done = (analytics?.keywordsCount ?? 0) > 0;
  const step3Done = (analytics?.contentPlanProgress ?? 0) > 0;
  const step1Active = !step1Done;
  const step2Active = step1Done && !step2Done;
  const step3Active = step2Done && !step3Done;

  const wordLabel =
    (analytics?.totalWordCount ?? 0) >= 1000
      ? `${((analytics?.totalWordCount ?? 0) / 1000).toFixed(1)}k`
      : String(analytics?.totalWordCount ?? 0);

  function handleRerun() {
    analyzeWebsite.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          qc.invalidateQueries({ queryKey: getGetProjectAnalyticsQueryKey(projectId) });
          qc.invalidateQueries({ queryKey: getListKeywordsQueryKey(projectId, {}) });
          qc.invalidateQueries({ queryKey: getGetContentPlanQueryKey(projectId) });
          qc.invalidateQueries({ queryKey: getListArticlesQueryKey(projectId, {}) });
        },
      }
    );
  }

  function refreshProject() {
    qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
  }

  if (projectLoading) {
    return (
      <Layout projectId={projectId}>
        <div className="p-8">
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-40 mb-8" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="p-8 text-muted-foreground">Project not found</div>
      </Layout>
    );
  }

  return (
    <Layout projectId={projectId} projectName={project.name}>
      <div className="p-8 max-w-5xl">
        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                <Globe className="h-4.5 w-4.5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{project?.name}</h1>
              <Badge variant={project?.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
                {project?.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground ml-11">{project?.websiteUrl}</p>
          </div>
          {!setting && (
            <Button variant="outline" size="sm" onClick={() => setLocation(`/projects/${projectId}/articles`)}>
              <FileText className="h-4 w-4 mr-2" />
              View Articles
            </Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* ── SETUP IN PROGRESS ───────────────────────────────────────── */}
          {setting ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="max-w-xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-base">Setting up your project</p>
                  <p className="text-sm text-muted-foreground">
                    AutoSEO is analyzing your website and building your content strategy. This takes about 30–60 seconds.
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full mb-6 overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "5%" }}
                  animate={{
                    width: step3Done ? "100%" : step2Done ? "66%" : step1Done ? "33%" : "10%",
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <SetupStep
                  index={0}
                  icon={Brain}
                  label="Analyzing Website"
                  description="Understanding your business, niche, and target audience"
                  done={step1Done}
                  active={step1Active}
                />
                <SetupStep
                  index={1}
                  icon={Key}
                  label="Researching Keywords"
                  description="Finding 20+ high-value keywords for Google and AI search"
                  done={step2Done}
                  active={step2Active}
                />
                <SetupStep
                  index={2}
                  icon={Calendar}
                  label="Building Content Plan"
                  description="Creating your 30-day editorial calendar"
                  done={step3Done}
                  active={step3Active}
                />
              </div>

              <p className="text-xs text-muted-foreground mt-5 text-center">
                Refreshing automatically — you can leave this page and come back
              </p>
            </motion.div>
          ) : (
            /* ── ACTIVE DASHBOARD ───────────────────────────────────────── */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              {/* WordPress panel */}
              <WordPressPanel projectId={projectId} project={project} onRefresh={refreshProject} />

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  label="Total Articles"
                  value={analytics?.totalArticles ?? 0}
                  icon={FileText}
                  sub={`${analytics?.publishedArticles ?? 0} published`}
                />
                <StatCard
                  label="Words Written"
                  value={wordLabel}
                  icon={TrendingUp}
                  sub="total content"
                />
                <StatCard
                  label="Keywords"
                  value={analytics?.keywordsCount ?? 0}
                  icon={Key}
                  sub="researched"
                />
                <StatCard
                  label="Content Plan"
                  value={`${analytics?.contentPlanProgress ?? 0}%`}
                  icon={Calendar}
                  sub="complete"
                />
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Analysis summary */}
                <div className="bg-card border border-card-border rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-500/10">
                      <Brain className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Website Analysis</p>
                      <p className="text-xs text-primary flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Completed
                      </p>
                    </div>
                  </div>
                  {project?.niche && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.niche}</p>
                  )}
                  <Button
                    data-testid="button-analyze-website"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleRerun}
                    disabled={analyzeWebsite.isPending}
                  >
                    {analyzeWebsite.isPending ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Running...</>
                    ) : (
                      "Re-run Setup"
                    )}
                  </Button>
                </div>

                {/* Keywords summary */}
                <div className="bg-card border border-card-border rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-yellow-500/10">
                      <Key className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Keyword Research</p>
                      <p className="text-xs text-primary flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {analytics?.keywordsCount ?? 0} keywords
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Targeting Google and AI search engines
                  </p>
                  <Button
                    data-testid="button-generate-keywords"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setLocation(`/projects/${projectId}/keywords`)}
                  >
                    View Keywords <ArrowRight className="h-3 w-3 ml-2" />
                  </Button>
                </div>

                {/* Content plan summary */}
                <div className="bg-card border border-card-border rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Content Plan</p>
                      <p className="text-xs text-primary flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> 30-day plan ready
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {analytics?.contentPlanProgress ?? 0}% of articles generated
                  </p>
                  <Button
                    data-testid="button-generate-content-plan"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setLocation(`/projects/${projectId}/content-plan`)}
                  >
                    View Plan <ArrowRight className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              </div>

              {/* Recent Articles */}
              {(analytics?.recentArticles?.length ?? 0) > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Recent Articles</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setLocation(`/projects/${projectId}/articles`)}
                    >
                      View all <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {analytics?.recentArticles?.map((article) => (
                      <div
                        key={article.id}
                        data-testid={`row-article-${article.id}`}
                        className="flex items-center gap-3 bg-card border border-card-border rounded-md px-4 py-3 cursor-pointer hover:border-primary/30 transition-colors"
                        onClick={() => setLocation(`/projects/${projectId}/articles/${article.id}`)}
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{article.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{article.keyword}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {article.wordCount && (
                            <span className="text-xs text-muted-foreground stat-number">{article.wordCount.toLocaleString()}w</span>
                          )}
                          {article.wordpressPostId && (
                            <span title="Published to WordPress">
                              <WpIcon className="h-3.5 w-3.5 text-[#21759b]" />
                            </span>
                          )}
                          <StatusBadge status={article.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty — no articles yet */}
              {(analytics?.totalArticles ?? 0) === 0 && (
                <div className="bg-card border border-card-border rounded-lg p-8 text-center">
                  <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-medium mb-1">Ready to write</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your keywords and content plan are ready. Start generating articles from the plan.
                  </p>
                  <Button size="sm" onClick={() => setLocation(`/projects/${projectId}/content-plan`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Open Content Plan
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    published: { label: "Published", className: "bg-primary/15 text-primary" },
    draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
    generating: { label: "Generating", className: "bg-blue-500/15 text-blue-400 pulse-glow" },
    failed: { label: "Failed", className: "bg-destructive/15 text-destructive" },
  };
  const c = config[status] ?? config.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}
