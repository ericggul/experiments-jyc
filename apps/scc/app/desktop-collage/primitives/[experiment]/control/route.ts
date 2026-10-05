import * as one from "@/components/desktop-collage/primitives/1/server";
import * as two from "@/components/desktop-collage/primitives/2/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Local control of real browser windows for each primitives experiment.
const experiments: Record<string, typeof one> = { "1": one, "2": two };
type Context = { params: Promise<{ experiment: string }> };

async function handle(request: Request, { params }: Context, method: "GET" | "POST") {
  const { experiment } = await params;
  const selected = experiments[experiment];
  return selected ? selected[method](request) : new Response(null, { status: 404 });
}

export const GET = (request: Request, context: Context) => handle(request, context, "GET");
export const POST = (request: Request, context: Context) => handle(request, context, "POST");
