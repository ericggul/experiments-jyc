import { standaloneAppUrl } from "@/lib/standalone-app-url";

export function GET(request: Request) {
  return Response.redirect(
    standaloneAppUrl(request, {
      developmentPort: process.env.DDONG_MEONG_PORT || "2010",
      environmentKey: "DDONG_MEONG_APP_URL",
      legacyPrefix: "/ddong-meong",
      productionFallback: "https://ddong-meong.vercel.app",
    }),
    307,
  );
}
