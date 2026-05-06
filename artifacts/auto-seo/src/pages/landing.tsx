import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Globe, Brain, ArrowRight, CheckCircle2, FileText, Search, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"url" | "name">("url");
  const createProject = useCreateProject();

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setStep("name");
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const projectName = name.trim() || new URL(url.includes("://") ? url : `https://${url}`).hostname.replace("www.", "");
    const websiteUrl = url.includes("://") ? url : `https://${url}`;
    createProject.mutate(
      { data: { name: projectName, websiteUrl, language: "en" } },
      { onSuccess: (project) => setLocation(`/projects/${project.id}`) }
    );
  }

  const stats = [
    { value: "216%", label: "Avg Traffic Increase" },
    { value: "2,479+", label: "Businesses Growing" },
    { value: "100+", label: "Languages Supported" },
  ];

  const features = [
    {
      icon: Globe,
      title: "Website Analysis",
      description: "AI analyzes your site, understands your niche, and identifies what your audience is searching for.",
    },
    {
      icon: Search,
      title: "Keyword Research",
      description: "Generate 20+ high-value keywords targeting both Google and AI search engines like ChatGPT and Perplexity.",
    },
    {
      icon: FileText,
      title: "30-Day Content Plan",
      description: "A complete editorial calendar with article topics, target keywords, and search intent — ready to execute.",
    },
    {
      icon: Brain,
      title: "AI Article Writing",
      description: "Expert-quality SEO articles of 1,500–3,000 words, fully formatted and ready to publish.",
    },
    {
      icon: TrendingUp,
      title: "Rank on Google",
      description: "Content structured to satisfy Google's quality signals — E-E-A-T compliant, structured with schema in mind.",
    },
    {
      icon: BarChart3,
      title: "Track Performance",
      description: "Dashboard shows articles published, word count produced, and content plan completion at a glance.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-base tracking-tight">AutoSEO</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/projects")}>
              Dashboard
            </Button>
            <Button size="sm" onClick={() => setLocation("/projects/new")}>
              Start Free
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-6 text-xs font-medium px-3 py-1">
              <span className="text-primary mr-1.5">●</span>
              Ranked on Google AND ChatGPT / Perplexity
            </Badge>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
              SEO content that{" "}
              <span className="text-primary">writes itself</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12">
              Enter your website URL. AutoSEO analyzes your business, builds a 30-day content strategy, and writes expert SEO articles — on autopilot.
            </p>

            {/* Input area */}
            <div className="max-w-xl mx-auto">
              {step === "url" ? (
                <form onSubmit={handleUrlSubmit} className="flex gap-2">
                  <Input
                    data-testid="input-website-url"
                    type="url"
                    placeholder="https://yourbusiness.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="h-12 text-base bg-card border-border"
                    autoFocus
                  />
                  <Button
                    data-testid="button-url-submit"
                    type="submit"
                    size="lg"
                    className="shrink-0 h-12 px-6"
                    disabled={!url.trim()}
                  >
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleCreate} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="truncate">{url}</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      data-testid="input-project-name"
                      placeholder="Project name (e.g. Acme Plumbing)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 text-base bg-card border-border"
                      autoFocus
                    />
                    <Button
                      data-testid="button-create-project"
                      type="submit"
                      size="lg"
                      className="shrink-0 h-12 px-6"
                      disabled={createProject.isPending}
                    >
                      {createProject.isPending ? "Creating..." : "Launch"} <Zap className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                No credit card required. Get your first 3 articles free.
              </p>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16 flex items-center justify-center gap-12"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-primary stat-number">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Everything SEO. Nothing manual.
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From analysis to published article — AutoSEO handles the full pipeline so you can focus on running your business.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-card border border-card-border rounded-lg p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border/50">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Start ranking in 60 seconds
          </h2>
          <p className="text-muted-foreground mb-8">
            Enter your website URL and AutoSEO will build your entire SEO content strategy while you sleep.
          </p>
          <Button size="lg" className="h-12 px-8 text-base" onClick={() => setLocation("/projects/new")}>
            Create Your First Project <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span>AutoSEO</span>
          </div>
          <span>SEO on autopilot</span>
        </div>
      </footer>
    </div>
  );
}
