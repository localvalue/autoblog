import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetContentPlan, getGetContentPlanQueryKey,
  useGenerateContentPlan,
  useCreateArticle, getListArticlesQueryKey,
  useGetProject, getGetProjectQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, RefreshCw, Loader2, FileText, Plus, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const INTENT_COLORS: Record<string, string> = {
  informational: "text-blue-400",
  commercial: "text-yellow-400",
  transactional: "text-green-400",
  navigational: "text-purple-400",
};

export default function ContentPlan() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });
  const { data: plan, isLoading } = useGetContentPlan(projectId, {
    query: { enabled: !!projectId, queryKey: getGetContentPlanQueryKey(projectId) },
  });

  const generateContentPlan = useGenerateContentPlan();
  const createArticle = useCreateArticle();

  const [generatingFor, setGeneratingFor] = useState<number | null>(null);

  function handleGenerate() {
    generateContentPlan.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetContentPlanQueryKey(projectId) });
          toast({ title: "Content plan generated", description: "Your 30-day editorial calendar is ready." });
        },
      }
    );
  }

  function handleGenerateArticle(item: { id: number; title: string; keyword: string; searchIntent: string }) {
    setGeneratingFor(item.id);
    createArticle.mutate(
      {
        projectId,
        data: {
          title: item.title,
          keyword: item.keyword,
          searchIntent: item.searchIntent,
          language: project?.language ?? "en",
        },
      },
      {
        onSuccess: (article) => {
          setGeneratingFor(null);
          qc.invalidateQueries({ queryKey: getListArticlesQueryKey(projectId, {}) });
          toast({ title: "Article generation started" });
          setLocation(`/projects/${projectId}/articles/${article.id}`);
        },
        onError: () => setGeneratingFor(null),
      }
    );
  }

  const weeks = plan ? groupByWeek(plan) : [];

  return (
    <Layout projectId={projectId} projectName={project?.name}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Content Plan</h1>
            <p className="text-sm text-muted-foreground mt-1">
              30-day editorial calendar — {plan?.length ?? 0} articles planned
            </p>
          </div>
          <Button
            data-testid="button-generate-content-plan"
            variant={plan?.length ? "outline" : "default"}
            onClick={handleGenerate}
            disabled={generateContentPlan.isPending}
          >
            {generateContentPlan.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" />
                {plan?.length ? "Regenerate Plan" : "Generate 30-Day Plan"}</>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : !plan?.length ? (
          <div className="flex flex-col items-center justify-center h-52 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium mb-1">No content plan yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a 30-day content calendar with AI-selected topics and keywords
            </p>
            <Button size="sm" onClick={handleGenerate} disabled={generateContentPlan.isPending}>
              Generate Content Plan
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {weeks.map((week, wi) => (
              <motion.div
                key={wi}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: wi * 0.08 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Week {wi + 1}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {week.map((item) => (
                    <div
                      key={item.id}
                      data-testid={`card-plan-${item.id}`}
                      className="bg-card border border-card-border rounded-lg p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Day {item.dayNumber}</span>
                        {item.articleId ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <span className={`text-xs capitalize ${INTENT_COLORS[item.searchIntent] ?? "text-muted-foreground"}`}>
                            {item.searchIntent}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium leading-tight line-clamp-2">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.keyword}</p>
                      <div className="mt-auto pt-1">
                        {item.articleId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs h-7"
                            onClick={() => setLocation(`/projects/${projectId}/articles/${item.articleId}`)}
                          >
                            <FileText className="h-3 w-3 mr-1.5" />
                            View Article
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-7"
                            disabled={generatingFor === item.id || createArticle.isPending}
                            onClick={() => handleGenerateArticle(item)}
                          >
                            {generatingFor === item.id ? (
                              <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Writing...</>
                            ) : (
                              <><Plus className="h-3 w-3 mr-1.5" />Generate</>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function groupByWeek<T extends { dayNumber: number }>(items: T[]): T[][] {
  const weeks: T[][] = [];
  items.forEach((item) => {
    const weekIdx = Math.floor((item.dayNumber - 1) / 7);
    if (!weeks[weekIdx]) weeks[weekIdx] = [];
    weeks[weekIdx].push(item);
  });
  return weeks;
}

// useState must be imported from react
import { useState } from "react";
