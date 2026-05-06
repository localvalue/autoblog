import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateProject } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Globe, Zap } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
];

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  websiteUrl: z.string().url("Enter a valid URL (e.g. https://yourbusiness.com)"),
  language: z.string().min(2),
});

type FormData = z.infer<typeof schema>;

export default function NewProject() {
  const [, setLocation] = useLocation();
  const createProject = useCreateProject();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", websiteUrl: "", language: "en" },
  });

  function onSubmit(data: FormData) {
    createProject.mutate(
      { data: { name: data.name, websiteUrl: data.websiteUrl, language: data.language } },
      { onSuccess: (project) => setLocation(`/projects/${project.id}`) }
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-xl">
        <button
          onClick={() => setLocation("/projects")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to projects
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">New SEO Project</h1>
            <p className="text-sm text-muted-foreground">Enter your website details to start generating content</p>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-website-url"
                        placeholder="https://yourbusiness.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      The website you want to create SEO content for
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-project-name"
                        placeholder="e.g. Acme Plumbing Co"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-language">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                data-testid="button-create-project"
                type="submit"
                className="w-full"
                disabled={createProject.isPending}
              >
                {createProject.isPending ? (
                  "Creating project..."
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}
