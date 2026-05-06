import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  FileText,
  FolderOpen,
  Globe,
  Key,
  LayoutDashboard,
  Calendar,
  ChevronRight,
  Zap,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  projectId?: number;
  projectName?: string;
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer",
          active
            ? "bg-primary/15 text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
        {active && <ChevronRight className="ml-auto h-3 w-3 opacity-60" />}
      </div>
    </Link>
  );
}

export default function Layout({ children, projectId, projectName }: LayoutProps) {
  const [location] = useLocation();

  const mainNav = [
    { href: "/projects", icon: FolderOpen, label: "Projects" },
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
  ];

  const projectNav = projectId
    ? [
        { href: `/projects/${projectId}`, icon: LayoutDashboard, label: "Dashboard" },
        { href: `/projects/${projectId}/articles`, icon: FileText, label: "Articles" },
        { href: `/projects/${projectId}/keywords`, icon: Key, label: "Keywords" },
        { href: `/projects/${projectId}/content-plan`, icon: Calendar, label: "Content Plan" },
      ]
    : [];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <Link href="/">
            <span className="font-semibold text-base tracking-tight text-foreground cursor-pointer hover:text-primary transition-colors">
              AutoSEO
            </span>
          </Link>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={location === item.href || (item.href !== "/" && location.startsWith(item.href) && !projectId)}
            />
          ))}

          {/* Project sub-nav */}
          {projectId && (
            <div className="mt-4 pt-4 border-t border-sidebar-border">
              <div className="px-3 mb-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Globe className="h-3 w-3" />
                  <span className="truncate">{projectName ?? "Project"}</span>
                </div>
              </div>
              <div className="space-y-0.5">
                {projectNav.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={
                      item.href === `/projects/${projectId}`
                        ? location === item.href
                        : location.startsWith(item.href)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <Link href="/projects/new">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer">
              <span>+ New Project</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
