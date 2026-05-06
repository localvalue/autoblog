import { useLocation } from "wouter";
import { useGetAnalyticsSummary, getGetAnalyticsSummaryQueryKey, useListProjects, getListProjectsQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, FileText, Globe, TrendingUp, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

function StatCard({ label, value, icon: Icon, className }: { label: string; value: string | number; icon: React.ElementType; className?: string }) {
  return (
    <div className={`bg-card border border-card-border rounded-lg p-6 ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-3xl font-bold stat-number text-foreground">{value}</div>
    </div>
  );
}

export default function Analytics() {
  const [, setLocation] = useLocation();

  const { data: summary, isLoading: summaryLoading } = useGetAnalyticsSummary({
    query: { queryKey: getGetAnalyticsSummaryQueryKey() },
  });
  const { data: projects, isLoading: projectsLoading } = useListProjects({
    query: { queryKey: getListProjectsQueryKey() },
  });

  const isLoading = summaryLoading || projectsLoading;

  const totalWords = summary?.totalWordCount ?? 0;
  const wordLabel = totalWords >= 1000 ? `${(totalWords / 1000).toFixed(1)}k` : String(totalWords);

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Performance overview across all your SEO projects
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard label="Total Projects" value={summary?.totalProjects ?? 0} icon={Globe} />
            <StatCard label="Active Projects" value={summary?.activeProjects ?? 0} icon={CheckCircle2} />
            <StatCard label="Total Articles" value={summary?.totalArticles ?? 0} icon={FileText} />
            <StatCard label="Words Written" value={wordLabel} icon={TrendingUp} />
          </div>
        )}

        {/* Projects breakdown */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Projects
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : !projects?.length ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No projects yet. Create one to start tracking.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project, i) => (
                <motion.div
                  key={project.id}
                  data-testid={`row-project-${project.id}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                  className="flex items-center gap-4 bg-card border border-card-border rounded-lg px-4 py-3.5 cursor-pointer hover:border-primary/30 transition-colors group"
                  onClick={() => setLocation(`/projects/${project.id}`)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{project.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{project.websiteUrl}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      project.status === "active" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {project.status}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
