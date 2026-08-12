import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureStudioSchema } from "@/db/raw";
import { workflowDefinitions } from "@/db/schema";

export async function GET() {
  await ensureStudioSchema();
  const workflows = await getDb().select().from(workflowDefinitions).orderBy(desc(workflowDefinitions.updatedAt)).limit(50);
  return Response.json({ workflows });
}

export async function POST(request: Request) {
  try {
    await ensureStudioSchema();
    const body = await request.json() as { id?: string; name?: string; description?: string; nodes?: unknown[]; edges?: unknown[] };
    const nodes = Array.isArray(body.nodes) ? body.nodes.slice(0, 100) : [];
    const edges = Array.isArray(body.edges) ? body.edges.slice(0, 200) : [];
    if (!body.name?.trim() || nodes.length === 0) return Response.json({ error: "Workflow name and at least one node are required." }, { status: 400 });
    const id = body.id || `flow_${crypto.randomUUID()}`;
    const updatedAt = new Date().toISOString();
    await getDb().insert(workflowDefinitions).values({ id, name: body.name.trim(), description: body.description?.trim() || "", nodesJson: JSON.stringify(nodes), edgesJson: JSON.stringify(edges), status: "draft", updatedAt }).onConflictDoUpdate({ target: workflowDefinitions.id, set: { name: body.name.trim(), description: body.description?.trim() || "", nodesJson: JSON.stringify(nodes), edgesJson: JSON.stringify(edges), updatedAt } });
    return Response.json({ ok: true, id, updatedAt }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save workflow" }, { status: 500 });
  }
}
