import { standaloneAppUrl } from "@/lib/standalone-app-url";

export function GET(request: Request) {
  return Response.redirect(
    standaloneAppUrl(request, {
      developmentPort: process.env.C_VAL_PORT || "2011",
      environmentKey: "C_VAL_APP_URL",
      legacyPrefix: "/c-val",
      productionFallback: "https://c-val.vercel.app",
    }),
    307,
  );
}
