import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListArticles, getListArticlesQueryKey,
  useGetProject, getGetProjectQueryKey,
  useCreateArticle,
  useDeleteArticle,
  useRegenerateArticle,
} from "@workspace/api-client-react";
import type { ListArticlesStatus } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, RefreshCw, Trash2, Eye, Loader2, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

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

function IntentBadge({ intent }: { intent?: string | null }) {
  if (!intent) return null;
  const colors: Record<string, string> = {
    informational: "text-blue-400 bg-blue-500/10",
    commercial: "text-yellow-400 bg-yellow-500/10",
    transactional: "text-green-400 bg-green-500/10",
    navigational: "text-purple-400 bg-purple-500/10",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[intent] ?? "text-muted-foreground bg-muted"}`}>
      {intent}
    </span>
  );
}

export default function ArticlesList() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });
  const statusFilter = filter !== "all" ? (filter as ListArticlesStatus) : undefined;
  const { data: articles, isLoading } = useListArticles(
    projectId,
    statusFilter ? { status: statusFilter } : {},
    { query: { enabled: !!projectId, queryKey: getListArticlesQueryKey(projectId, statusFilter ? { status: statusFilter } : {}) } }
  );

  const createArticle = useCreateArticle();
  const deleteArticle = useDeleteArticle();
  const regenerateArticle = useRegenerateArticle();

  const filtered = articles?.filter((a) =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.keyword.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  function handleCreate() {
    if (!newTitle.trim() || !newKeyword.trim()) return;
    createArticle.mutate(
      { projectId, data: { title: newTitle, keyword: newKeyword, language: project?.language ?? "en" } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListArticlesQueryKey(projectId, {}) });
          setDialogOpen(false);
          setNewTitle("");
          setNewKeyword("");
          toast({ title: "Article generation started", description: "Your article is being written by AI." });
        },
      }
    );
  }

  function handleDelete(articleId: number) {
    deleteArticle.mutate(
      { projectId, articleId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListArticlesQueryKey(projectId, {}) });
        },
      }
    );
  }

  function handleRegenerate(articleId: number) {
    regenerateArticle.mutate(
      { projectId, articleId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListArticlesQueryKey(projectId, {}) });
          toast({ title: "Regeneration started" });
        },
      }
    );
  }

  return (
    <Layout projectId={projectId} projectName={project?.name}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Articles</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filtered.length} article{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-article">
                <Plus className="h-4 w-4 mr-2" />
                Generate Article
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-card-border">
              <DialogHeader>
                <DialogTitle>Generate New Article</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Article Title</label>
                  <Input
                    data-testid="input-article-title"
                    placeholder="e.g. How to Fix a Leaky Faucet"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Target Keyword</label>
                  <Input
                    data-testid="input-article-keyword"
                    placeholder="e.g. how to fix leaky faucet"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                  />
                </div>
                <Button
                  data-testid="button-generate-article"
                  className="w-full"
                  onClick={handleCreate}
                  disabled={createArticle.isPending || !newTitle.trim() || !newKeyword.trim()}
                >
                  {createArticle.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating (may take ~30s)...</>
                  ) : (
                    "Generate Article"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-search-articles"
              placeholder="Search articles..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40" data-testid="select-filter-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="generating">Generating</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium mb-1">No articles found</p>
            <p className="text-sm text-muted-foreground mb-4">Generate your first article to start building SEO content</p>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Generate Article
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((article, i) => (
              <motion.div
                key={article.id}
                data-testid={`row-article-${article.id}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="flex items-center gap-4 bg-card border border-card-border rounded-lg px-4 py-3.5 group hover:border-primary/30 transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {article.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground truncate">
                      {article.keyword}
                    </span>
                    <IntentBadge intent={article.searchIntent} />
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {article.wordCount ? (
                    <span className="text-xs text-muted-foreground stat-number hidden sm:block">
                      {article.wordCount.toLocaleString()}w
                    </span>
                  ) : null}
                  <StatusBadge status={article.status} />
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      data-testid={`button-view-article-${article.id}`}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setLocation(`/projects/${projectId}/articles/${article.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      data-testid={`button-regen-article-${article.id}`}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleRegenerate(article.id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      data-testid={`button-delete-article-${article.id}`}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(article.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
