import { getSessionUser } from "@/lib/auth";
import { getDisputeListForSession } from "@/lib/disputes-read";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionUser();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const data = await getDisputeListForSession(session, {
    status: searchParams.get("status") ?? undefined,
    openedByRole: searchParams.get("openedByRole") ?? undefined,
  });

  return Response.json({
    data,
    disputes: data.items,
    totals: data.totals,
    filters: data.filters,
    total: data.totals.all,
  });
}
