import { standaloneAppUrl } from "@/lib/standalone-app-url";

export function GET(request: Request) {
  return Response.redirect(
    standaloneAppUrl(request, {
      developmentPort: process.env.GOLDFISHES_PORT || "2001",
      environmentKey: "GOLDFISHES_APP_URL",
      legacyPrefix: "/goldfishes",
      productionFallback: "https://goldfishes.vercel.app",
    }),
    307,
  );
}
