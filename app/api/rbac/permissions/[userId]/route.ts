import { getSessionUser } from "@/lib/auth";
import { getUserPermissionSnapshot } from "@/lib/rbac-server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSessionUser();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const canInspect = session.id === userId || session.ownerAccess || session.role === "admin";

  if (!canInspect) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshot = await getUserPermissionSnapshot(userId);
  if (!snapshot) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({
    data: snapshot,
    permissions: snapshot,
  });
}
