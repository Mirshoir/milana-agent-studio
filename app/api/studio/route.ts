import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureStudioSchema } from "@/db/raw";
import { agentProfiles, evalCases, evalRuns, promptVersions, releaseEvents } from "@/db/schema";

const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export async function GET() {
  try {
    await ensureStudioSchema();
    const db = getDb();
    const [versions, cases, runs, releases, profiles] = await Promise.all([
      db.select().from(promptVersions).orderBy(desc(promptVersions.createdAt)).limit(100),
      db.select().from(evalCases).orderBy(desc(evalCases.createdAt)).limit(100),
      db.select().from(evalRuns).orderBy(desc(evalRuns.createdAt)).limit(100),
      db.select().from(releaseEvents).orderBy(desc(releaseEvents.createdAt)).limit(100),
      db.select().from(agentProfiles).orderBy(desc(agentProfiles.updatedAt)).limit(216),
    ]);
    return Response.json({ versions, cases, runs, releases, profiles });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Studio data unavailable" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureStudioSchema();
    const db = getDb();
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "save-version") {
      const agent = body.agent as Record<string, unknown>;
      const agentId = `agent_${String(agent.id)}`;
      const existing = await db.select().from(promptVersions).where(eq(promptVersions.agentId, agentId));
      const version = existing.reduce((max, row) => Math.max(max, row.version), 0) + 1;
      const createdAt = now();
      const versionId = makeId("prompt");
      await db.batch([
        db.insert(agentProfiles).values({
          id: agentId,
          registryId: Number(agent.id),
          name: String(agent.agent),
          squad: String(agent.squad),
          purpose: String(agent.purpose),
          activation: String(agent.activation),
          status: "draft",
          updatedAt: createdAt,
        }).onConflictDoUpdate({ target: agentProfiles.registryId, set: { name: String(agent.agent), squad: String(agent.squad), purpose: String(agent.purpose), activation: String(agent.activation), updatedAt: createdAt } }),
        db.insert(promptVersions).values({
          id: versionId,
          agentId,
          version,
          systemPrompt: String(body.systemPrompt ?? ""),
          routingRule: String(body.routingRule ?? ""),
          guardrails: String(body.guardrails ?? ""),
          modelTier: String(body.modelTier ?? "small"),
          status: "draft",
          changeNote: String(body.changeNote ?? ""),
          createdAt,
        }),
      ]);
      return Response.json({ ok: true, versionId, version }, { status: 201 });
    }

    if (action === "record-run") {
      const run = {
        id: makeId("run"),
        agentId: String(body.agentId),
        promptVersionId: body.promptVersionId ? String(body.promptVersionId) : null,
        evalCaseId: null,
        customerMessage: String(body.customerMessage ?? ""),
        response: String(body.response ?? ""),
        groundedScore: Number(body.groundedScore ?? 0),
        languageScore: Number(body.languageScore ?? 0),
        salesScore: Number(body.salesScore ?? 0),
        safetyScore: Number(body.safetyScore ?? 0),
        latencyMs: Number(body.latencyMs ?? 0),
        status: String(body.status ?? "review"),
        notes: String(body.notes ?? ""),
        createdAt: now(),
      };
      await db.insert(evalRuns).values(run);
      return Response.json({ ok: true, run }, { status: 201 });
    }

    if (action === "promote") {
      const promptVersionId = String(body.promptVersionId ?? "");
      const agentId = String(body.agentId ?? "");
      if (!promptVersionId || !agentId) return Response.json({ error: "Save a prompt version before promotion." }, { status: 400 });
      const environment = String(body.environment ?? "staging");
      await db.batch([
        db.update(promptVersions).set({ status: environment === "production" ? "production" : "approved" }).where(eq(promptVersions.id, promptVersionId)),
        db.update(agentProfiles).set({ status: environment === "production" ? "production" : "approved", activeVersionId: promptVersionId, updatedAt: now() }).where(eq(agentProfiles.id, agentId)),
        db.insert(releaseEvents).values({ id: makeId("release"), agentId, promptVersionId, environment, action: "promote", approver: "Workspace owner", notes: String(body.notes ?? ""), createdAt: now() }),
      ]);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown studio action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Studio operation failed" }, { status: 500 });
  }
}
