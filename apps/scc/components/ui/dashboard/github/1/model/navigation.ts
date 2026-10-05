export type NavigationItem = {
  id: string;
  title: string;
  description?: string;
};

export type NavigationMenu = {
  id: "platform" | "solutions" | "resources" | "open-source" | "enterprise";
  label: string;
  groups: {
    id: string;
    label: string;
    items: readonly NavigationItem[];
  }[];
};

export const navigationMenus: readonly NavigationMenu[] = [
  {
    id: "platform",
    label: "Platform",
    groups: [
      {
        id: "ai-code-creation",
        label: "AI code creation",
        items: [
          {
            id: "copilot",
            title: "GitHub Copilot",
            description: "Write better code with AI",
          },
          {
            id: "copilot-app",
            title: "GitHub Copilot app",
            description: "Direct agents from issue to merge",
          },
          {
            id: "mcp-registry",
            title: "MCP Registry",
            description: "Integrate external tools",
          },
        ],
      },
      {
        id: "developer-workflows",
        label: "Developer workflows",
        items: [
          { id: "actions", title: "Actions", description: "Automate any workflow" },
          { id: "codespaces", title: "Codespaces", description: "Instant dev environments" },
          { id: "issues", title: "Issues", description: "Plan and track work" },
          { id: "code-review", title: "Code Review", description: "Manage code changes" },
          { id: "code-quality", title: "Code Quality", description: "Enforce quality at merge" },
        ],
      },
      {
        id: "application-security",
        label: "Application security",
        items: [
          {
            id: "advanced-security",
            title: "GitHub Advanced Security",
            description: "Find and fix vulnerabilities",
          },
          { id: "code-security", title: "Code security", description: "Secure your code as you build" },
          { id: "secret-protection", title: "Secret protection", description: "Stop leaks before they start" },
        ],
      },
      {
        id: "explore",
        label: "Explore",
        items: [
          { id: "why-github", title: "Why GitHub" },
          { id: "documentation", title: "Documentation" },
          { id: "blog", title: "Blog" },
          { id: "changelog", title: "Changelog" },
          { id: "marketplace", title: "Marketplace" },
        ],
      },
    ],
  },
  {
    id: "solutions",
    label: "Solutions",
    groups: [
      {
        id: "by-company-size",
        label: "By company size",
        items: [
          { id: "enterprise", title: "Enterprises" },
          { id: "teams", title: "Small and medium teams" },
          { id: "startups", title: "Startups" },
          { id: "nonprofits", title: "Nonprofits" },
        ],
      },
      {
        id: "by-use-case",
        label: "By use case",
        items: [
          { id: "app-modernization", title: "App Modernization" },
          { id: "devsecops", title: "DevSecOps" },
          { id: "devops", title: "DevOps" },
          { id: "cicd", title: "CI/CD" },
        ],
      },
      {
        id: "by-industry",
        label: "By industry",
        items: [
          { id: "healthcare", title: "Healthcare" },
          { id: "financial-services", title: "Financial services" },
          { id: "manufacturing", title: "Manufacturing" },
          { id: "government", title: "Government" },
        ],
      },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    groups: [
      {
        id: "explore-by-topic",
        label: "Explore by topic",
        items: [
          { id: "ai", title: "AI" },
          { id: "software-development", title: "Software Development" },
          { id: "devops-topic", title: "DevOps" },
          { id: "security", title: "Security" },
        ],
      },
      {
        id: "explore-by-type",
        label: "Explore by type",
        items: [
          { id: "customer-stories", title: "Customer stories" },
          { id: "events", title: "Events & webinars" },
          { id: "ebooks", title: "Ebooks & reports" },
          { id: "business-insights", title: "Business insights" },
        ],
      },
      {
        id: "support-services",
        label: "Support & services",
        items: [
          { id: "docs", title: "Documentation" },
          { id: "support", title: "Customer support" },
          { id: "community", title: "Community forum" },
          { id: "trust", title: "Trust center" },
        ],
      },
    ],
  },
  {
    id: "open-source",
    label: "Open Source",
    groups: [
      {
        id: "community",
        label: "Community",
        items: [{ id: "sponsors", title: "GitHub Sponsors", description: "Fund open source developers" }],
      },
      {
        id: "programs",
        label: "Programs",
        items: [
          { id: "security-lab", title: "Security Lab" },
          { id: "maintainer-community", title: "Maintainer Community" },
          { id: "stars", title: "GitHub Stars" },
          { id: "archive-program", title: "Archive Program" },
        ],
      },
      {
        id: "repositories",
        label: "Repositories",
        items: [
          { id: "topics", title: "Topics" },
          { id: "trending", title: "Trending" },
          { id: "collections", title: "Collections" },
        ],
      },
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    groups: [
      {
        id: "enterprise-solutions",
        label: "Enterprise solutions",
        items: [{ id: "enterprise-platform", title: "Enterprise platform", description: "AI-powered developer platform" }],
      },
      {
        id: "available-add-ons",
        label: "Available add-ons",
        items: [
          { id: "enterprise-security", title: "GitHub Advanced Security" },
          { id: "copilot-business", title: "Copilot for Business" },
          { id: "premium-support", title: "Premium Support" },
        ],
      },
    ],
  },
];
