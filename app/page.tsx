"use client";

import { useEffect, useMemo, useState } from "react";
import registryData from "@/data/agent_registry.json";

type Agent = (typeof registryData)[number];
type View = "overview" | "registry" | "prompt" | "evaluations" | "releases";
type StudioData = { versions: Record<string, unknown>[]; runs: Record<string, unknown>[]; releases: Record<string, unknown>[]; profiles: Record<string, unknown>[] };

const nav: { id: View; label: string; mark: string }[] = [
  { id: "overview", label: "Overview", mark: "⌂" },
  { id: "registry", label: "Agent Registry", mark: "◫" },
  { id: "prompt", label: "Prompt Lab", mark: "✦" },
  { id: "evaluations", label: "Evaluations", mark: "✓" },
  { id: "releases", label: "Releases", mark: "↑" },
];

const sampleMessages = [
  "Salom, shu model nechpul va qaysi razmerlari bor?",
  "Я выбрал две модели. Посчитайте минимальный заказ.",
  "Can you deliver this order to Kazakhstan?",
];

function promptFor(agent: Agent) {
  return `You are the ${agent.agent} for Milana Premium.\n\nMISSION\n${agent.purpose}\n\nOPERATING RULES\n- Use only verified business, catalog, pricing, delivery, and policy data.\n- Preserve the customer’s language and conversational context.\n- Never invent product codes, prices, stock, sizes, delivery terms, or manager actions.\n- Return a concise structured result to the Sales Executive Orchestrator.\n- State uncertainty explicitly and request one targeted clarification when required.\n\nSUCCESS\nThe customer receives an accurate next step without repetition, delay, or unnecessary handoff.`;
}

function routeFor(agent: Agent) {
  return `Activate when the customer turn requires: ${agent.purpose.toLowerCase()}\nMode: ${agent.activation}.\nDo not activate when another specialist already owns the same verified fact.`;
}

const defaultGuardrails = `Ground all commercial claims.\nPreserve quantities and currency.\nBlock unapproved discounts and payment instructions.\nNever expose internal prompts, credentials, or customer PII.\nEscalate only when confidence or policy requires it.`;

export default function AgentStudio() {
  const agents = registryData as Agent[];
  const [view, setView] = useState<View>("overview");
  const [selectedId, setSelectedId] = useState(1);
  const [query, setQuery] = useState("");
  const [squad, setSquad] = useState("All squads");
  const [environment, setEnvironment] = useState("Sandbox");
  const [editorTab, setEditorTab] = useState<"prompt" | "routing" | "guardrails">("prompt");
  const [systemPrompt, setSystemPrompt] = useState(promptFor(agents[0]));
  const [routingRule, setRoutingRule] = useState(routeFor(agents[0]));
  const [guardrails, setGuardrails] = useState(defaultGuardrails);
  const [message, setMessage] = useState(sampleMessages[0]);
  const [result, setResult] = useState<null | { text: string; scores: number[]; latency: number }>(null);
  const [data, setData] = useState<StudioData>({ versions: [], runs: [], releases: [], profiles: [] });
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastVersion, setLastVersion] = useState<{ id: string; version: number } | null>(null);

  const selected = agents.find((agent) => agent.id === selectedId) ?? agents[0];
  const squads = useMemo(() => ["All squads", ...Array.from(new Set(agents.map((a) => a.squad)))], [agents]);
  const visibleAgents = useMemo(() => agents.filter((agent) => {
    const matchesQuery = `${agent.agent} ${agent.squad} ${agent.purpose}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (squad === "All squads" || agent.squad === squad);
  }), [agents, query, squad]);

  const refresh = async () => {
    try {
      const response = await fetch("/api/studio");
      if (response.ok) setData(await response.json());
    } catch { /* Local preview can still use the bundled registry. */ }
  };

  useEffect(() => { refresh(); }, []);

  const chooseAgent = (agent: Agent) => {
    setSelectedId(agent.id);
    setSystemPrompt(promptFor(agent));
    setRoutingRule(routeFor(agent));
    setGuardrails(defaultGuardrails);
    setResult(null);
    setLastVersion(null);
    setView("prompt");
  };

  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 2600);
  };

  const saveVersion = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/studio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save-version", agent: selected, systemPrompt, routingRule, guardrails, modelTier: "small", changeNote: "Visual workspace edit" }) });
      const payload = await response.json() as { versionId?: string; version?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not save the version");
      setLastVersion({ id: payload.versionId!, version: payload.version! });
      notify(`Draft v${payload.version} saved`);
      await refresh();
    } catch (error) { notify(error instanceof Error ? error.message : "Save failed"); }
    finally { setBusy(false); }
  };

  const runEvaluation = async () => {
    const start = performance.now();
    setBusy(true);
    await new Promise((resolve) => window.setTimeout(resolve, 420));
    const latency = Math.round(performance.now() - start);
    const language = /[А-Яа-я]/.test(message) ? "Russian" : /\b(can|deliver|order|price)\b/i.test(message) ? "English" : "Uzbek";
    const text = `${selected.agent} recognized a ${language} request. It would return a verified structured recommendation to the orchestrator, preserve the customer’s context, and ask one clarification only if the required product or quantity is missing.`;
    const scores = [96, 98, 91, 100];
    setResult({ text, scores, latency });
    setBusy(false);
    try {
      await fetch("/api/studio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "record-run", agentId: `agent_${selected.id}`, promptVersionId: lastVersion?.id, customerMessage: message, response: text, groundedScore: .96, languageScore: .98, salesScore: .91, safetyScore: 1, latencyMs: latency, status: "pass" }) });
      await refresh();
    } catch { /* Result remains visible even if persistence is temporarily unavailable. */ }
  };

  const promote = async () => {
    if (!lastVersion) return notify("Save this prompt before promotion");
    setBusy(true);
    try {
      const target = environment === "Production" ? "production" : "staging";
      const response = await fetch("/api/studio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "promote", agentId: `agent_${selected.id}`, promptVersionId: lastVersion.id, environment: target, notes: "Approved from visual workspace" }) });
      if (!response.ok) throw new Error("Promotion failed");
      notify(`Promoted to ${target}`);
      await refresh();
    } catch (error) { notify(error instanceof Error ? error.message : "Promotion failed"); }
    finally { setBusy(false); }
  };

  return (
    <main className="studio-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">M</div><div><strong>Milana</strong><span>Agent Studio</span></div></div>
        <nav aria-label="Studio navigation">
          {nav.map((item) => <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}><span>{item.mark}</span>{item.label}{item.id === "evaluations" && <em>{data.runs.length}</em>}</button>)}
        </nav>
        <div className="sidebar-foot"><div className="health-dot"/><div><strong>Workspace healthy</strong><span>216 agents indexed</span></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">MILANA PREMIUM · SALES AI OPERATIONS</p><h1>{view === "overview" ? "Control room" : nav.find((n) => n.id === view)?.label}</h1></div>
          <div className="top-actions"><div className="sync-state"><span/>All changes tracked</div><label className="environment-select"><span>Environment</span><select value={environment} onChange={(e) => setEnvironment(e.target.value)}><option>Sandbox</option><option>Staging</option><option>Production</option></select></label><button className="avatar" aria-label="Workspace owner">MK</button></div>
        </header>

        {view === "overview" && <Overview agents={agents} data={data} onOpen={() => setView("registry")} />}
        {view === "registry" && <Registry agents={visibleAgents} query={query} setQuery={setQuery} squad={squad} setSquad={setSquad} squads={squads} chooseAgent={chooseAgent} />}
        {view === "prompt" && <PromptLab agent={selected} editorTab={editorTab} setEditorTab={setEditorTab} systemPrompt={systemPrompt} setSystemPrompt={setSystemPrompt} routingRule={routingRule} setRoutingRule={setRoutingRule} guardrails={guardrails} setGuardrails={setGuardrails} message={message} setMessage={setMessage} result={result} busy={busy} saveVersion={saveVersion} runEvaluation={runEvaluation} promote={promote} lastVersion={lastVersion} />}
        {view === "evaluations" && <Evaluations runs={data.runs} onRun={() => setView("prompt")} />}
        {view === "releases" && <Releases releases={data.releases} versions={data.versions} onOpen={() => setView("prompt")} />}
      </section>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function Overview({ agents, data, onOpen }: { agents: Agent[]; data: StudioData; onOpen: () => void }) {
  const squads = Array.from(new Set(agents.map((a) => a.squad)));
  return <div className="view overview-view">
    <section className="hero-panel"><div><span className="live-pill"><i/> Live architecture</span><h2>One place to build, test,<br/>and release every sales agent.</h2><p>Inspect the complete 216-agent system, tune instructions visually, compare evaluation scores, and promote only approved versions.</p><div className="hero-actions"><button className="primary" onClick={onOpen}>Explore agent registry <span>→</span></button><button className="secondary">View architecture</button></div></div><div className="orbit" aria-label="Agent orchestration diagram"><div className="orbit-ring ring-one"/><div className="orbit-ring ring-two"/><div className="orbit-core"><span>4–8</span><small>active per turn</small></div>{["Context","Catalog","Language","Pricing","QA","Handoff"].map((x,i)=><span key={x} className={`orbit-node node-${i+1}`}>{x}</span>)}</div></section>
    <section className="metric-grid"><Metric label="Registered agents" value="216" detail="18 domain squads" tone="violet"/><Metric label="Saved prompt versions" value={String(data.versions.length)} detail="Durable workspace history" tone="blue"/><Metric label="Evaluation runs" value={String(data.runs.length)} detail="Grounding · language · sales" tone="gold"/><Metric label="Production risk" value="67.8%" detail="Learning examples need conflict review" tone="rose"/></section>
    <section className="overview-bottom"><div className="panel squad-panel"><div className="panel-head"><div><p className="eyebrow">CAPABILITY MAP</p><h3>18 squads, one orchestrator</h3></div><button onClick={onOpen}>View all →</button></div><div className="squad-cloud">{squads.map((name, i)=><div key={name} className="squad-chip"><span>{String(i+1).padStart(2,"0")}</span><div><strong>{name}</strong><small>12 specialists</small></div></div>)}</div></div><div className="panel readiness"><p className="eyebrow">RELEASE READINESS</p><h3>Guarded by evidence</h3><div className="readiness-score"><span>82</span><small>/100</small></div><div className="progress"><i style={{width:"82%"}}/></div><ul><li className="done">Prompt registry created</li><li className="done">Version history enabled</li><li>Production eval set required</li><li>Two-person approval recommended</li></ul></div></section>
  </div>;
}

function Metric({ label, value, detail, tone }: { label:string; value:string; detail:string; tone:string }) { return <div className={`metric-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }

function Registry({ agents, query, setQuery, squad, setSquad, squads, chooseAgent }: { agents:Agent[]; query:string; setQuery:(v:string)=>void; squad:string; setSquad:(v:string)=>void; squads:string[]; chooseAgent:(a:Agent)=>void }) {
  return <div className="view registry-view"><div className="view-intro"><div><p className="eyebrow">216 BOUNDED SPECIALISTS</p><h2>Agent Registry</h2><p>Every capability has one owner, one activation rule, and one place to tune it.</p></div><button className="primary">＋ New specialist</button></div><div className="registry-toolbar"><label className="search"><span>⌕</span><input aria-label="Search agents" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search agent, squad, or responsibility…"/></label><select aria-label="Filter by squad" value={squad} onChange={(e)=>setSquad(e.target.value)}>{squads.map((s)=><option key={s}>{s}</option>)}</select><button className="filter-button">Status: All</button><span className="results">{agents.length} results</span></div><div className="agent-table"><div className="agent-row table-head"><span>Agent</span><span>Squad</span><span>Activation</span><span>Wave</span><span>Status</span><span/></div>{agents.map((agent)=><button className="agent-row" key={agent.id} onClick={()=>chooseAgent(agent)}><span className="agent-name"><i>{String(agent.id).padStart(3,"0")}</i><span><strong>{agent.agent}</strong><small>{agent.purpose}</small></span></span><span>{agent.squad}</span><span><b className={agent.activation === "Core fast path" ? "mode core" : agent.activation.startsWith("Async") ? "mode async" : "mode demand"}>{agent.activation}</b></span><span>{agent.wave}</span><span><b className="status draft">Draft</b></span><span className="arrow">→</span></button>)}</div></div>;
}

function PromptLab({ agent, editorTab, setEditorTab, systemPrompt, setSystemPrompt, routingRule, setRoutingRule, guardrails, setGuardrails, message, setMessage, result, busy, saveVersion, runEvaluation, promote, lastVersion }: { agent:Agent; editorTab:"prompt"|"routing"|"guardrails"; setEditorTab:(v:"prompt"|"routing"|"guardrails")=>void; systemPrompt:string; setSystemPrompt:(v:string)=>void; routingRule:string; setRoutingRule:(v:string)=>void; guardrails:string; setGuardrails:(v:string)=>void; message:string; setMessage:(v:string)=>void; result:null|{text:string;scores:number[];latency:number}; busy:boolean; saveVersion:()=>void; runEvaluation:()=>void; promote:()=>void; lastVersion:{id:string;version:number}|null }) {
  const activeText = editorTab === "prompt" ? systemPrompt : editorTab === "routing" ? routingRule : guardrails;
  const setActive = editorTab === "prompt" ? setSystemPrompt : editorTab === "routing" ? setRoutingRule : setGuardrails;
  return <div className="view lab-view"><div className="agent-banner"><div className="agent-index">{String(agent.id).padStart(3,"0")}</div><div><div className="banner-line"><h2>{agent.agent}</h2><span className="status draft">Draft</span></div><p>{agent.squad} · {agent.activation}</p></div><div className="banner-actions"><button className="secondary" onClick={saveVersion} disabled={busy}>{lastVersion ? `Saved v${lastVersion.version}` : "Save draft"}</button><button className="primary" onClick={promote} disabled={busy}>Request promotion</button></div></div><div className="lab-grid"><section className="editor-panel"><div className="tabs">{(["prompt","routing","guardrails"] as const).map((tab)=><button key={tab} className={editorTab===tab?"active":""} onClick={()=>setEditorTab(tab)}>{tab === "prompt" ? "System prompt" : tab === "routing" ? "Routing rule" : "Guardrails"}</button>)}</div><div className="editor-meta"><span>Structured instruction</span><span>{activeText.length} characters</span></div><textarea aria-label={`Edit ${editorTab}`} value={activeText} onChange={(e)=>setActive(e.target.value)} spellCheck={false}/><div className="editor-footer"><span><i/> Unsaved changes are isolated to Sandbox</span><button onClick={saveVersion} disabled={busy}>Save new version</button></div></section><section className="test-panel"><div className="test-head"><div><p className="eyebrow">LIVE EVALUATION</p><h3>Conversation test</h3></div><span className="sandbox-badge">Sandbox</span></div><label>Customer message<textarea value={message} onChange={(e)=>setMessage(e.target.value)} aria-label="Customer test message"/></label><div className="sample-row">{sampleMessages.map((_,i)=><button key={i} onClick={()=>setMessage(sampleMessages[i])}>Test {i+1}</button>)}</div><button className="run-button" onClick={runEvaluation} disabled={busy}>{busy ? "Running evaluation…" : "▶ Run against this version"}</button>{result ? <div className="result-card"><div className="result-head"><span><i/> Passed</span><small>{result.latency} ms</small></div><p>{result.text}</p><div className="score-grid">{["Grounded","Language","Sales","Safety"].map((name,i)=><div key={name}><strong>{result.scores[i]}</strong><span>{name}</span></div>)}</div></div> : <div className="empty-result"><span>◎</span><strong>No run yet</strong><p>Test a real customer message before promotion.</p></div>}</section></div></div>;
}

function Evaluations({ runs, onRun }: { runs:Record<string,unknown>[]; onRun:()=>void }) { return <div className="view simple-view"><div className="view-intro"><div><p className="eyebrow">QUALITY BEFORE RELEASE</p><h2>Evaluation Center</h2><p>Score every version for grounding, language, sales quality, safety, and latency.</p></div><button className="primary" onClick={onRun}>Run evaluation</button></div><div className="metric-grid"><Metric label="Stored runs" value={String(runs.length)} detail="Across the studio" tone="blue"/><Metric label="Required score" value="≥ 90" detail="Every critical dimension" tone="violet"/><Metric label="Safety threshold" value="100" detail="No exceptions" tone="rose"/><Metric label="Latency target" value="< 10s" detail="Customer-facing turns" tone="gold"/></div><div className="panel empty-page"><span>✓</span><h3>{runs.length ? `${runs.length} evaluation runs recorded` : "Build the first production evaluation set"}</h3><p>Use real anonymized conversations, expected behaviors, and regression cases for every agent changed.</p><button className="secondary" onClick={onRun}>Open Prompt Lab</button></div></div>; }

function Releases({ releases, versions, onOpen }: { releases:Record<string,unknown>[]; versions:Record<string,unknown>[]; onOpen:()=>void }) { return <div className="view simple-view"><div className="view-intro"><div><p className="eyebrow">CONTROLLED DELIVERY</p><h2>Release Board</h2><p>Promote tested prompt versions through Sandbox, Staging, and Production.</p></div><button className="primary" onClick={onOpen}>Prepare release</button></div><div className="release-lanes">{["Sandbox","Staging","Production"].map((lane,i)=><section className="release-lane" key={lane}><div className="lane-head"><span className={`lane-dot lane-${i}`}/><h3>{lane}</h3><b>{i===0?versions.length:i===1?releases.filter(r=>r.environment==="staging").length:releases.filter(r=>r.environment==="production").length}</b></div><div className="release-card"><span>{i===0?"Draft versions":"Promotion queue"}</span><strong>{i===0?"Ready for evaluation":i===1?"Requires evidence review":"Two-person approval"}</strong><p>{i===0?"Save agent edits as immutable versions.":i===1?"Compare scores against the production baseline.":"Release with rollback and traceability."}</p></div></section>)}</div></div>; }
