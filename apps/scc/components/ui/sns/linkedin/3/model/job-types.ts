export type LinkedinJob = {
  id: string;
  sourceId: string;
  title: string;
  company: string;
  location: string;
  workplace: "On-site" | "Hybrid" | "Remote";
  employment: "Full-time";
  team: string;
  postedAt: string;
  description: string;
  sourceBoard: string;
  applicationUrl: string;
};
