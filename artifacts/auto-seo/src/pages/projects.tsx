import { useLocation } from "wouter";
import { useListProjects, getListProjectsQueryKey } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Plus, ArrowRight, Clock, CheckCircle2, Pause } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-muted-foreground" },
  analyzing: { label: "Analyzing", icon: Clock, color: "text-blue-400" },
  active: { label: "Active", icon: CheckCircle2, color: "text-primary" },
  paused: { label: "Paused", icon: Pause, color: "text-yellow-400" },
};

export default function Projects() {
  const [, setLocation] = useLocation();
  const { data: projects, isLoading } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your SEO projects — one per website or brand.
            </p>
          </div>
          <Button data-testid="button-new-project" onClick={() => setLocation("/projects/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : !projects?.length ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="font-medium text-lg mb-1">No projects yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Create your first project to start generating SEO content
            </p>
            <Button onClick={() => setLocation("/projects/new")}>
              <Plus className="h-4 w-4 mr-2" /> Create Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project, i) => {
              const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.pending;
              const StatusIcon = status.icon;
              return (
                <motion.div
                  key={project.id}
                  data-testid={`card-project-${project.id}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  className="bg-card border border-card-border rounded-lg p-5 cursor-pointer hover:border-primary/40 transition-all group"
                  onClick={() => setLocation(`/projects/${project.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${status.color}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {status.label}
                    </div>
                  </div>
                  <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate mb-3">{project.websiteUrl}</p>
                  {project.niche && (
                    <Badge variant="secondary" className="text-xs">
                      {project.niche}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    <span>Open dashboard</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
