import * as one from "@/components/desktop-collage/hype/1/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Local control of real browser windows for each hype experiment.
const experiments: Record<string, typeof one> = { "1": one };
type Context = { params: Promise<{ experiment: string }> };

async function handle(request: Request, { params }: Context, method: "GET" | "POST") {
  const { experiment } = await params;
  const selected = experiments[experiment];
  return selected ? selected[method](request) : new Response(null, { status: 404 });
}

export const GET = (request: Request, context: Context) => handle(request, context, "GET");
export const POST = (request: Request, context: Context) => handle(request, context, "POST");
