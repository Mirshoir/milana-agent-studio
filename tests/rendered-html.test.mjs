import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

async function callApi(path, body) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("api-test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders Agent Market", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Agent Market — Discover or build your own AI agent<\/title>/i);
  assert.match(html, /Find an agent/);
  assert.match(html, /Or describe your own/);
  assert.match(html, /Explore agents/);
  assert.match(html, /Create a custom agent/);
  assert.match(html, /Build a complete agent team/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("graph runner executes only a structurally valid graph", async () => {
  const response = await callApi("/api/flow-test", {
    nodes: [
      { id: "start", type: "trigger", label: "Inbound", subtitle: "Test" },
      { id: "finish", type: "output", label: "Answer", subtitle: "Test" },
    ],
    edges: [{ id: "e1", from: "start", to: "finish" }],
    scenario: "catalog_request",
    ownership: "AI_ACTIVE",
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.status, "pass");
  assert.deepEqual(result.path.map((step) => step.label), ["Inbound", "Answer"]);
  assert.equal(result.engine, "Deterministic graph runner");
});

test("graph runner blocks incomplete Kotiba-shaped workflows", async () => {
  const response = await callApi("/api/flow-test", {
    nodes: [
      { id: "start", type: "trigger", label: "Instagram inbound", subtitle: "Test" },
      { id: "orchestrator", type: "agent", label: "Sales Agent Orchestrator", subtitle: "Test", agentId: 1 },
      { id: "finish", type: "output", label: "Answer", subtitle: "Test" },
    ],
    edges: [{ id: "e1", from: "start", to: "orchestrator" }, { id: "e2", from: "orchestrator", to: "finish" }],
    scenario: "catalog_request",
    ownership: "AI_ACTIVE",
  });
  assert.equal(response.status, 422);
  const result = await response.json();
  assert.equal(result.status, "fail");
  assert.match(result.issues.join(" "), /Agent 017|Ownership Gate/);
});
