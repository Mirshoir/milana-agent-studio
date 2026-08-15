import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureStudioSchema } from "@/db/raw";
import { workflowDefinitions } from "@/db/schema";
import {
  CURRENT_WORKFLOW_ID,
  MILANA_INSTAGRAM_COMMENTS_WORKFLOW_ID,
  MILANA_INSTAGRAM_LEARNING_WORKFLOW_ID,
  MILANA_WEBSITE_QA_WORKFLOW_ID,
  UNIVERSAL_WORKFLOW_ID,
  currentKotibaWorkflow,
  milanaInstagramAccountLearningWorkflow,
  milanaInstagramCommentsWorkflow,
  milanaWebsiteQaWorkflow,
  universalOmnichannelWorkflow,
} from "@/data/workflow_templates";

async function ensureDefaultWorkflows() {
  const now = new Date().toISOString();
  await getDb().insert(workflowDefinitions).values([
    {
      id: CURRENT_WORKFLOW_ID,
      name: currentKotibaWorkflow.name,
      description: currentKotibaWorkflow.description,
      nodesJson: JSON.stringify(currentKotibaWorkflow.nodes),
      edgesJson: JSON.stringify(currentKotibaWorkflow.edges),
      status: "production_locked",
      version: 1,
      updatedAt: now,
    },
    {
      id: UNIVERSAL_WORKFLOW_ID,
      name: universalOmnichannelWorkflow.name,
      description: universalOmnichannelWorkflow.description,
      nodesJson: JSON.stringify(universalOmnichannelWorkflow.nodes),
      edgesJson: JSON.stringify(universalOmnichannelWorkflow.edges),
      status: "draft",
      version: 1,
      updatedAt: now,
    },
    {
      id: MILANA_WEBSITE_QA_WORKFLOW_ID,
      name: milanaWebsiteQaWorkflow.name,
      description: milanaWebsiteQaWorkflow.description,
      nodesJson: JSON.stringify(milanaWebsiteQaWorkflow.nodes),
      edgesJson: JSON.stringify(milanaWebsiteQaWorkflow.edges),
      status: "draft",
      version: 1,
      updatedAt: now,
    },
    {
      id: MILANA_INSTAGRAM_COMMENTS_WORKFLOW_ID,
      name: milanaInstagramCommentsWorkflow.name,
      description: milanaInstagramCommentsWorkflow.description,
      nodesJson: JSON.stringify(milanaInstagramCommentsWorkflow.nodes),
      edgesJson: JSON.stringify(milanaInstagramCommentsWorkflow.edges),
      status: "draft",
      version: 1,
      updatedAt: now,
    },
    {
      id: MILANA_INSTAGRAM_LEARNING_WORKFLOW_ID,
      name: milanaInstagramAccountLearningWorkflow.name,
      description: milanaInstagramAccountLearningWorkflow.description,
      nodesJson: JSON.stringify(milanaInstagramAccountLearningWorkflow.nodes),
      edgesJson: JSON.stringify(milanaInstagramAccountLearningWorkflow.edges),
      status: "draft",
      version: 1,
      updatedAt: now,
    },
  ]).onConflictDoNothing();
}

export async function GET() {
  await ensureStudioSchema();
  await ensureDefaultWorkflows();
  const workflows = await getDb().select().from(workflowDefinitions).orderBy(desc(workflowDefinitions.updatedAt)).limit(50);
  const legacyDuplicates = workflows.filter((workflow) => {
    if (workflow.id === CURRENT_WORKFLOW_ID || workflow.status !== "draft" || workflow.name !== currentKotibaWorkflow.name) return false;
    try {
      const nodes = JSON.parse(workflow.nodesJson) as Array<{ id?: string; label?: string; agentId?: number }>;
      const hasHistory = nodes.some((node) => node.agentId === 17);
      const hasOwnership = nodes.some((node) => /ownership/i.test(`${node.id || ""} ${node.label || ""}`));
      return !hasHistory || !hasOwnership;
    } catch {
      return true;
    }
  });
  for (const duplicate of legacyDuplicates) {
    await getDb().update(workflowDefinitions).set({ status: "archived", updatedAt: new Date().toISOString() }).where(eq(workflowDefinitions.id, duplicate.id));
  }
  return Response.json({ workflows: workflows.filter((workflow) => workflow.status !== "archived"), archivedLegacyDuplicates: legacyDuplicates.length });
}

export async function POST(request: Request) {
  try {
    await ensureStudioSchema();
    const body = await request.json() as { id?: string; name?: string; description?: string; nodes?: unknown[]; edges?: unknown[]; action?: string };
    const nodes = Array.isArray(body.nodes) ? body.nodes.slice(0, 100) : [];
    const edges = Array.isArray(body.edges) ? body.edges.slice(0, 200) : [];
    if (!body.name?.trim() || nodes.length === 0) return Response.json({ error: "Workflow name and at least one node are required." }, { status: 400 });
    const id = body.id || `flow_${crypto.randomUUID()}`;
    const updatedAt = new Date().toISOString();
    const existing = await getDb().select().from(workflowDefinitions).where(eq(workflowDefinitions.id, id)).limit(1);
    if (existing[0]?.status === "production_locked") {
      return Response.json({ error: "The saved production snapshot is immutable. Create or duplicate a draft to make changes." }, { status: 409 });
    }
    const nextVersion = existing[0] ? Number(existing[0].version || 1) + 1 : 1;
    await getDb().insert(workflowDefinitions).values({ id, name: body.name.trim(), description: body.description?.trim() || "", nodesJson: JSON.stringify(nodes), edgesJson: JSON.stringify(edges), status: "draft", version: nextVersion, updatedAt }).onConflictDoUpdate({ target: workflowDefinitions.id, set: { name: body.name.trim(), description: body.description?.trim() || "", nodesJson: JSON.stringify(nodes), edgesJson: JSON.stringify(edges), version: nextVersion, updatedAt } });
    return Response.json({ ok: true, id, version: nextVersion, updatedAt }, { status: existing[0] ? 200 : 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save workflow" }, { status: 500 });
  }
}
