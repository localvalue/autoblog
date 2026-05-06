import { useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListKeywords, getListKeywordsQueryKey,
  useGenerateKeywords,
  useGetProject, getGetProjectQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Key, RefreshCw, Loader2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const INTENT_COLORS: Record<string, string> = {
  informational: "text-blue-400 bg-blue-500/10",
  commercial: "text-yellow-400 bg-yellow-500/10",
  transactional: "text-green-400 bg-green-500/10",
  navigational: "text-purple-400 bg-purple-500/10",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-green-400",
  medium: "text-yellow-400",
  hard: "text-red-400",
};

export default function KeywordsList() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });
  const { data: keywords, isLoading } = useListKeywords(projectId, {
    query: { enabled: !!projectId, queryKey: getListKeywordsQueryKey(projectId) },
  });
  const generateKeywords = useGenerateKeywords();

  function handleGenerate() {
    generateKeywords.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListKeywordsQueryKey(projectId) });
          toast({ title: "Keywords generated" });
        },
      }
    );
  }

  return (
    <Layout projectId={projectId} projectName={project?.name}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Keywords</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {keywords?.length ?? 0} keywords researched
            </p>
          </div>
          <Button
            data-testid="button-generate-keywords"
            variant={keywords?.length ? "outline" : "default"}
            onClick={handleGenerate}
            disabled={generateKeywords.isPending}
          >
            {generateKeywords.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" />
                {keywords?.length ? "Regenerate" : "Generate Keywords"}</>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : !keywords?.length ? (
          <div className="flex flex-col items-center justify-center h-52 text-center">
            <Key className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium mb-1">No keywords yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Generate keyword suggestions based on your website and niche
            </p>
            <Button size="sm" onClick={handleGenerate} disabled={generateKeywords.isPending}>
              Generate Keywords
            </Button>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <div className="col-span-5">Keyword</div>
              <div className="col-span-3">Intent</div>
              <div className="col-span-2">Difficulty</div>
              <div className="col-span-2 text-right">Priority</div>
            </div>
            <div className="space-y-1">
              {keywords.map((kw, i) => (
                <motion.div
                  key={kw.id}
                  data-testid={`row-keyword-${kw.id}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="grid grid-cols-12 gap-4 items-center bg-card border border-card-border rounded-lg px-4 py-3 hover:border-primary/20 transition-colors"
                >
                  <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                    <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{kw.keyword}</span>
                    {kw.used && (
                      <span className="shrink-0 text-xs text-primary">Used</span>
                    )}
                  </div>
                  <div className="col-span-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${INTENT_COLORS[kw.searchIntent] ?? "text-muted-foreground bg-muted"}`}>
                      {kw.searchIntent}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-xs font-medium capitalize ${DIFFICULTY_COLORS[kw.difficulty] ?? "text-muted-foreground"}`}>
                      {kw.difficulty}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground stat-number">{kw.priority}/10</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
