import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Projects from "@/pages/projects";
import NewProject from "@/pages/new-project";
import ProjectDashboard from "@/pages/project-dashboard";
import ArticlesList from "@/pages/articles-list";
import ArticleDetail from "@/pages/article-detail";
import KeywordsList from "@/pages/keywords-list";
import ContentPlan from "@/pages/content-plan";
import Analytics from "@/pages/analytics";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/new" component={NewProject} />
      <Route path="/projects/:id/articles/:articleId" component={ArticleDetail} />
      <Route path="/projects/:id/articles" component={ArticlesList} />
      <Route path="/projects/:id/keywords" component={KeywordsList} />
      <Route path="/projects/:id/content-plan" component={ContentPlan} />
      <Route path="/projects/:id" component={ProjectDashboard} />
      <Route path="/analytics" component={Analytics} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
