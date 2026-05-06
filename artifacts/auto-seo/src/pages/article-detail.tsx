import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useGetArticle, getGetArticleQueryKey,
  useUpdateArticle,
  useRegenerateArticle,
  useGetProject, getGetProjectQueryKey,
  usePublishToWordPress,
  getListArticlesQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RefreshCw, Globe, Key, FileText, Loader2, ExternalLink, ImageIcon } from "lucide-react";
import { WpIcon } from "@/components/wp-icon";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    published: { label: "Published", variant: "default" },
    draft: { label: "Draft", variant: "secondary" },
    generating: { label: "Generating...", variant: "outline" },
    failed: { label: "Failed", variant: "destructive" },
  };
  const c = config[status] ?? config.draft;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export default function ArticleDetail() {
  const { id, articleId } = useParams<{ id: string; articleId: string }>();
  const projectId = Number(id);
  const artId = Number(articleId);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });
  const { data: article, isLoading } = useGetArticle(projectId, artId, {
    query: { enabled: !!projectId && !!artId, queryKey: getGetArticleQueryKey(projectId, artId) },
  });

  const regenerateArticle = useRegenerateArticle();
  const updateArticle = useUpdateArticle();
  const publishToWP = usePublishToWordPress();

  const wpConnected = !!project?.wordpressConnected;

  function handleRegenerate() {
    regenerateArticle.mutate(
      { projectId, articleId: artId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetArticleQueryKey(projectId, artId) });
          qc.invalidateQueries({ queryKey: getListArticlesQueryKey(projectId, {}) });
          toast({ title: "Article regenerated" });
        },
      }
    );
  }

  function handlePublish() {
    updateArticle.mutate(
      { projectId, articleId: artId, data: { status: "published" } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetArticleQueryKey(projectId, artId) });
          toast({ title: "Article published" });
        },
      }
    );
  }

  function handlePublishToWP() {
    toast({ title: "Publishing to WordPress...", description: "Generating featured image and creating post. This may take ~30 seconds." });
    publishToWP.mutate(
      { projectId, articleId: artId },
      {
        onSuccess: (updated) => {
          qc.invalidateQueries({ queryKey: getGetArticleQueryKey(projectId, artId) });
          qc.invalidateQueries({ queryKey: getListArticlesQueryKey(projectId, {}) });
          toast({
            title: "Published to WordPress",
            description: updated.wordpressPostId ? `Post ID: ${updated.wordpressPostId}` : "Post created successfully",
          });
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Publishing failed";
          toast({ title: "WordPress publish failed", description: message, variant: "destructive" });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <Layout projectId={projectId} projectName={project?.name}>
        <div className="p-8 max-w-4xl">
          <Skeleton className="h-8 w-2/3 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-8" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!article) {
    return (
      <Layout projectId={projectId} projectName={project?.name}>
        <div className="p-8 text-muted-foreground">Article not found</div>
      </Layout>
    );
  }

  const alreadyOnWP = !!article.wordpressPostId;

  return (
    <Layout projectId={projectId} projectName={project?.name}>
      <div className="p-8 max-w-4xl">
        {/* Back */}
        <button
          onClick={() => setLocation(`/projects/${projectId}/articles`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to articles
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="text-2xl font-bold tracking-tight leading-tight">{article.title}</h1>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <StatusBadge status={article.status} />
              <Button
                data-testid="button-regenerate-article"
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={regenerateArticle.isPending || article.status === "generating"}
              >
                {regenerateArticle.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Regenerating...</>
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Regenerate</>
                )}
              </Button>
              {article.status === "draft" && (
                <Button
                  data-testid="button-publish-article"
                  size="sm"
                  variant="outline"
                  onClick={handlePublish}
                  disabled={updateArticle.isPending}
                >
                  Mark Published
                </Button>
              )}
              {/* WordPress publish button */}
              {article.content && wpConnected && !alreadyOnWP && (
                <Button
                  data-testid="button-publish-to-wordpress"
                  size="sm"
                  onClick={handlePublishToWP}
                  disabled={publishToWP.isPending}
                  className="bg-[#21759b] hover:bg-[#1a5e7a] text-white border-0"
                >
                  {publishToWP.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Publishing...</>
                  ) : (
                    <><ImageIcon className="h-3.5 w-3.5 mr-1.5" />Publish to WordPress</>
                  )}
                </Button>
              )}
              {alreadyOnWP && (
                <Badge className="bg-[#21759b]/15 text-[#21759b] border-[#21759b]/30 gap-1.5">
                  <WpIcon className="h-3 w-3" />
                  WP #{article.wordpressPostId}
                </Badge>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" />
              <span className="font-medium">{article.keyword}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              <span className="uppercase">{article.language}</span>
            </div>
            {article.wordCount && (
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span className="stat-number">{article.wordCount.toLocaleString()} words</span>
              </div>
            )}
            {article.searchIntent && (
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                {article.searchIntent}
              </span>
            )}
            {article.wordpressPublishedAt && (
              <div className="flex items-center gap-1.5 text-[#21759b]">
                <WpIcon className="h-3.5 w-3.5" />
                <span>Published to WP {new Date(article.wordpressPublishedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* WordPress not connected notice */}
          {article.content && !wpConnected && !alreadyOnWP && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-border/50">
              <WpIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground flex-1">
                Connect WordPress in your project dashboard to publish this article directly.
              </p>
              <button
                onClick={() => setLocation(`/projects/${projectId}`)}
                className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
              >
                Connect <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Meta description */}
          {article.metaDescription && (
            <div className="mt-4 p-3 rounded-md bg-muted/50 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Meta Description</p>
              <p className="text-sm text-foreground">{article.metaDescription}</p>
            </div>
          )}
        </div>

        {/* Content */}
        {article.status === "generating" ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
            <p className="font-medium">Generating article content...</p>
            <p className="text-sm text-muted-foreground mt-1">This usually takes 20–40 seconds</p>
          </div>
        ) : article.content ? (
          <div className="bg-card border border-card-border rounded-lg p-8">
            <div className="prose prose-sm prose-dark max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {article.content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="font-medium mb-2">No content yet</p>
            <Button size="sm" onClick={handleRegenerate}>
              Generate Content
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
