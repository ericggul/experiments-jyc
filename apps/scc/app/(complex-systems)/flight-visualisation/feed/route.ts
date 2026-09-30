import {
  getFeedSnapshot,
  parseFeedQuery,
} from "@/components/complex-systems/flight-visualisation/feed/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = parseFeedQuery(new URL(request.url).searchParams);
  if (!query) {
    return Response.json({ error: "lat, lon and radius are required" }, { status: 400 });
  }

  try {
    return Response.json(await getFeedSnapshot(query), {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json({ error: "no upstream feed available" }, { status: 502 });
  }
}
