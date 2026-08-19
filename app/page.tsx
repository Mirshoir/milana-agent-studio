"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type View = "marketplace" | "builder" | "auditions" | "teams" | "library" | "activity" | "settings";
type MarketAgent = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  icon: string;
  accent: string;
  creator: string;
  installs: number;
  rating: number;
  verified?: boolean;
  featured?: boolean;
  tags: string[];
};
type EvidenceStatus = "verified" | "corroborated" | "inferred" | "user-confirmed" | "template-default" | "missing" | "contradicted";
type EvidenceRecord = { id: string; claim: string; status: EvidenceStatus; sourceType: string; sourceUrl?: string; confidence: number; affects: string[]; retrievedAt: string };
type ReadinessDimension = { id: string; label: string; state: "ready" | "review" | "missing"; detail: string };
type AgentPackageManifest = {
  schemaVersion: "1.0";
  packageId: string;
  version: number;
  license: string;
  inputs: string[];
  outputs: string[];
  permissions: { read: string[]; withApproval: string[]; denied: string[] };
  evidence: EvidenceRecord[];
  readiness: { score: number; evidenceCoverage: number; dimensions: ReadinessDimension[] };
  interoperability: { a2a: "not-configured" | "valid"; mcpTools: string[] };
  release: { status: "draft" | "published"; immutable: boolean; changelog: string; publishedAt?: string };
};
type Blueprint = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  icon: string;
  accent: string;
  model: string;
  status: "draft" | "published";
  purpose: string;
  systemPrompt: string;
  tools: string[];
  channels: string[];
  guardrails: string[];
  knowledge: string[];
  starters: string[];
  steps: Array<{ title: string; detail: string }>;
  package: AgentPackageManifest;
  updatedAt: string;
};
type TeamAgent = { id: string; name: string; role: string; purpose: string; icon: string; accent: string; tools: string[]; inputs: string[]; outputs: string[]; guardrails: string[] };
type TeamEdge = { id: string; from: string; to: string; label: string; condition: string; payload: string[] };
type TeamResearch = { mode: "live-ai" | "site-evidence" | "domain-blueprint" | "manual"; summary: string; findings: Array<{ title: string; detail: string; confidence: "high" | "medium" | "assumption" }>; sources: Array<{ title: string; url: string }>; gaps: string[]; completedAt: string };
type AgentTeam = { id: string; name: string; description: string; objective: string; status: "draft" | "published"; creationMode: "prompt" | "manual"; agents: TeamAgent[]; edges: TeamEdge[]; sharedKnowledge: string[]; channels: string[]; triggers: string[]; successMetrics: string[]; research: TeamResearch; updatedAt: string };
type AuditionCase = { id: string; title: string; category: "quality" | "evidence" | "safety" | "resilience" | "routing"; detail: string };
type AuditionCandidate = { id: string; name: string; kind: "solo" | "duo" | "team"; summary: string; roles: Array<{ name: string; purpose: string; tools: string[] }>; strengths: string[]; results: Array<{ caseId: string; status: "pass" | "warning" | "fail"; score: number; observation: string }>; metrics: { overall: number; passRate: number; costPerRun: number; latencyMs: number; permissionScore: number; handoffReliability: number } };
type AgentAudition = { id: string; objective: string; benchmark: AuditionCase[]; candidates: AuditionCandidate[]; winner: AuditionCandidate; verdict: string; status: "completed"; installedTeamId?: string; createdAt: string };
type ChatMessage = { id: string; role: "architect" | "user"; text: string; time?: string };
type Toast = { text: string; tone?: "success" | "neutral" } | null;

const catalog: MarketAgent[] = [
  { id: "atlas", name: "Atlas Research", tagline: "Turn open questions into cited briefs", description: "Searches the web, compares sources, and delivers concise research with a transparent evidence trail.", category: "Research", icon: "A", accent: "sky", creator: "Northstar Labs", installs: 18400, rating: 4.9, verified: true, featured: true, tags: ["Web", "Citations", "Reports"] },
  { id: "luma", name: "Luma Support", tagline: "Resolve customer questions around the clock", description: "A multilingual support teammate grounded in your help center, policies, and past resolutions.", category: "Customer support", icon: "L", accent: "violet", creator: "Agent Market", installs: 26300, rating: 4.9, verified: true, tags: ["Support", "Multilingual", "Handoff"] },
  { id: "closer", name: "Closer", tagline: "Qualify, nurture, and route every lead", description: "Answers product questions, captures intent, updates your CRM, and books qualified meetings.", category: "Sales", icon: "C", accent: "orange", creator: "Pipeline Works", installs: 12100, rating: 4.8, verified: true, tags: ["CRM", "Email", "Calendar"] },
  { id: "pixel", name: "Pixel Copywriter", tagline: "On-brand content from brief to campaign", description: "Learns your voice and creates landing pages, social posts, emails, and campaign variations.", category: "Marketing", icon: "P", accent: "pink", creator: "Studio Nine", installs: 9700, rating: 4.7, tags: ["Content", "Brand voice", "Campaigns"] },
  { id: "sherlock", name: "Data Sherlock", tagline: "Ask questions of your business data", description: "Explores spreadsheets and databases, builds charts, and explains the signal behind the numbers.", category: "Data", icon: "S", accent: "emerald", creator: "Prism Data", installs: 15300, rating: 4.9, verified: true, tags: ["SQL", "Charts", "Analysis"] },
  { id: "ship", name: "Shipmate", tagline: "Plan, build, and review product work", description: "Turns requirements into technical plans, implementation tasks, test cases, and release notes.", category: "Engineering", icon: "S", accent: "indigo", creator: "Build Club", installs: 22600, rating: 4.8, verified: true, tags: ["Code", "GitHub", "Testing"] },
  { id: "mira", name: "Mira Recruiter", tagline: "A thoughtful first pass for every candidate", description: "Screens applications, prepares structured interviews, and keeps hiring teams aligned.", category: "People", icon: "M", accent: "gold", creator: "PeopleOS", installs: 5400, rating: 4.7, tags: ["Hiring", "Interviews", "Scorecards"] },
  { id: "shelf", name: "Shelf Concierge", tagline: "A personal shopper for every storefront", description: "Understands your catalog, recommends the right products, and guides customers to checkout.", category: "Commerce", icon: "S", accent: "lime", creator: "Retail AI", installs: 8300, rating: 4.8, tags: ["Catalog", "Recommendations", "Orders"] },
];

const categories = ["All", "Customer support", "Sales", "Research", "Marketing", "Data", "Engineering", "People", "Commerce"];
const quickPrompts = [
  "A multilingual support agent for my online store",
  "A research agent that creates cited competitor briefs",
  "A sales agent that qualifies leads and books meetings",
];

const initialMessages: ChatMessage[] = [
  { id: "welcome", role: "architect", text: "Tell me what you want your agent to do. I’ll turn your description into its role, instructions, tools, guardrails, knowledge plan, and starter conversations." },
];

function Glyph({ children }: { children: React.ReactNode }) {
  return <span className="glyph" aria-hidden="true">{children}</span>;
}

function formatInstalls(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(value);
}

export default function AgentMarketplace() {
  const [view, setView] = useState<View>("marketplace");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [savedAgents, setSavedAgents] = useState<Blueprint[]>([]);
  const [savedTeams, setSavedTeams] = useState<AgentTeam[]>([]);
  const [activeTeam, setActiveTeam] = useState<AgentTeam | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<MarketAgent | null>(null);
  const [webEnabled, setWebEnabled] = useState(true);
  const [model, setModel] = useState("Auto");
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const notify = (text: string, tone: "success" | "neutral" = "success") => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 2800);
  };

  const loadLibrary = async () => {
    try {
      const [agentResponse, teamResponse] = await Promise.all([fetch("/api/marketplace"), fetch("/api/teams")]);
      if (agentResponse.ok) {
        const payload = await agentResponse.json() as { agents?: Blueprint[] };
        setSavedAgents(payload.agents || []);
      }
      if (teamResponse.ok) {
        const payload = await teamResponse.json() as { teams?: AgentTeam[] };
        setSavedTeams(payload.teams || []);
      }
    } catch { /* The marketplace catalog remains available if persistence is offline. */ }
  };

  useEffect(() => { loadLibrary(); }, []);

  const filtered = useMemo(() => catalog.filter((agent) => {
    const matchesCategory = category === "All" || agent.category === category;
    const haystack = `${agent.name} ${agent.tagline} ${agent.description} ${agent.category} ${agent.tags.join(" ")}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  }), [category, query]);

  const startNew = () => {
    setMessages(initialMessages);
    setBlueprint(null);
    setPrompt("");
    setView("builder");
    setSidebarOpen(false);
    window.setTimeout(() => composerRef.current?.focus(), 50);
  };

  const createAgent = async (description: string) => {
    const clean = description.trim();
    if (!clean || busy) return;
    setView("builder");
    setPrompt("");
    setBusy(true);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: clean }]);
    try {
      const response = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "generate", description: clean, model, webEnabled }),
      });
      const payload = await response.json() as { agent?: Blueprint; error?: string };
      if (!response.ok || !payload.agent) throw new Error(payload.error || "The agent could not be created.");
      setBlueprint(payload.agent);
      setSavedAgents((current) => [payload.agent!, ...current.filter((item) => item.id !== payload.agent!.id)]);
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), role: "architect",
        text: `I built ${payload.agent!.name} as a reviewable Agent Package. Its readiness score is ${payload.agent!.package.readiness.score}/100, with ${payload.agent!.tools.length} declared tools, explicit permissions, evidence status, guardrails, and a ${payload.agent!.steps.length}-step workflow. Review the trust details before publishing.`,
      }]);
      notify("Agent blueprint created");
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "architect", text: error instanceof Error ? error.message : "Something went wrong while creating the agent." }]);
    } finally {
      setBusy(false);
    }
  };

  const submitPrompt = (event: FormEvent) => {
    event.preventDefault();
    createAgent(prompt);
  };

  const publish = async () => {
    if (!blueprint) return;
    setBusy(true);
    try {
      const response = await fetch("/api/marketplace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "publish", id: blueprint.id }) });
      const payload = await response.json() as { agent?: Blueprint; error?: string };
      if (!response.ok || !payload.agent) throw new Error(payload.error || "Publishing is temporarily unavailable.");
      const updated = payload.agent;
      setBlueprint(updated);
      setSavedAgents((current) => current.map((item) => item.id === updated.id ? updated : item));
      notify(`${updated.name} is live in your library`);
    } catch (error) { notify(error instanceof Error ? error.message : "Publish failed", "neutral"); }
    finally { setBusy(false); }
  };

  const installAgent = (agent: MarketAgent) => {
    setSelectedAgent(agent);
    setDetailsOpen(true);
  };

  const useTemplate = () => {
    if (!selectedAgent) return;
    setDetailsOpen(false);
    setMessages(initialMessages);
    setBlueprint(null);
    createAgent(`Create an agent inspired by ${selectedAgent.name}. ${selectedAgent.description} Make it customizable for my business and include ${selectedAgent.tags.join(", ")}.`);
  };

  return (
    <main className="app-shell">
      <Sidebar view={view} setView={setView} open={sidebarOpen} setOpen={setSidebarOpen} onNew={startNew} savedAgents={savedAgents} savedTeams={savedTeams} />
      <section className="app-main">
        <Topbar view={view} onMenu={() => setSidebarOpen(true)} model={model} setModel={setModel} blueprint={blueprint} onPublish={publish} busy={busy} />
        {view === "marketplace" && <Marketplace query={query} setQuery={setQuery} category={category} setCategory={setCategory} filtered={filtered} onCreate={createAgent} onTeam={() => { setActiveTeam(null); setView("teams"); }} onAudition={() => setView("auditions")} prompt={prompt} setPrompt={setPrompt} onInstall={installAgent} />}
        {view === "builder" && <Builder messages={messages} blueprint={blueprint} prompt={prompt} setPrompt={setPrompt} submit={submitPrompt} createAgent={createAgent} busy={busy} webEnabled={webEnabled} setWebEnabled={setWebEnabled} model={model} setModel={setModel} composerRef={composerRef} onPublish={publish} />}
        {view === "auditions" && <AuditionArena notify={notify} onInstalled={(team) => { setSavedTeams((current) => [team, ...current.filter((item) => item.id !== team.id)]); setActiveTeam(team); setView("teams"); }} />}
        {view === "teams" && <TeamStudio teams={savedTeams} setTeams={setSavedTeams} activeTeam={activeTeam} setActiveTeam={setActiveTeam} model={model} notify={notify} />}
        {view === "library" && <Library agents={savedAgents} onOpen={(agent) => { setBlueprint(agent); setMessages([...initialMessages, { id: crypto.randomUUID(), role: "architect", text: `${agent.name} is open. Ask me to change its behavior, tools, knowledge, or guardrails.` }]); setView("builder"); }} onNew={startNew} />}
        {view === "activity" && <Activity agents={savedAgents} />}
        {view === "settings" && <Settings model={model} setModel={setModel} webEnabled={webEnabled} setWebEnabled={setWebEnabled} notify={notify} />}
      </section>
      {detailsOpen && selectedAgent && <AgentModal agent={selectedAgent} onClose={() => setDetailsOpen(false)} onUse={useTemplate} />}
      {toast && <div className={`toast ${toast.tone}`} role="status"><span>✓</span>{toast.text}</div>}
    </main>
  );
}

function Sidebar({ view, setView, open, setOpen, onNew, savedAgents, savedTeams }: { view: View; setView: (view: View) => void; open: boolean; setOpen: (open: boolean) => void; onNew: () => void; savedAgents: Blueprint[]; savedTeams: AgentTeam[] }) {
  const navigate = (next: View) => { setView(next); setOpen(false); };
  return <>
    <button className={`sidebar-scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} aria-label="Close navigation" />
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand-row"><button className="brand" onClick={() => navigate("marketplace")}><span className="brand-symbol">✦</span><strong>Agent Market</strong></button><button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close menu">×</button></div>
      <button className="new-agent" onClick={onNew}><Glyph>＋</Glyph><span>New agent</span><kbd>⌘ K</kbd></button>
      <nav className="primary-nav" aria-label="Primary navigation">
        <NavButton active={view === "marketplace"} onClick={() => navigate("marketplace")} mark="⌂" label="Discover" />
        <NavButton active={view === "auditions"} onClick={() => navigate("auditions")} mark="◉" label="Audition arena" />
        <NavButton active={view === "teams"} onClick={() => navigate("teams")} mark="⌘" label="Agent teams" count={savedTeams.length || undefined} />
        <NavButton active={view === "library"} onClick={() => navigate("library")} mark="◫" label="My agents" count={savedAgents.length || undefined} />
        <NavButton active={view === "activity"} onClick={() => navigate("activity")} mark="↗" label="Activity" />
      </nav>
      <div className="sidebar-section">
        <div className="section-label"><span>Recent builds</span><button aria-label="More recent builds">•••</button></div>
        {savedAgents.slice(0, 4).map((agent) => <button className="recent-agent" key={agent.id} onClick={() => navigate("library")}><span className={`mini-avatar ${agent.accent}`}>{agent.icon}</span><span><strong>{agent.name}</strong><small>{agent.status === "published" ? "Published" : "Draft"}</small></span></button>)}
        {!savedAgents.length && <p className="empty-recents">Your generated agents will appear here.</p>}
      </div>
      <div className="sidebar-spacer" />
      <button className="upgrade-card" onClick={() => navigate("settings")}><span className="upgrade-icon">✦</span><span><strong>Creator plan</strong><small>7 days left in trial</small></span><i>↗</i></button>
      <button className={`profile-row ${view === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><span className="user-avatar">AM</span><span><strong>Alex Morgan</strong><small>Personal workspace</small></span><Glyph>···</Glyph></button>
    </aside>
  </>;
}

function NavButton({ active, onClick, mark, label, count }: { active: boolean; onClick: () => void; mark: string; label: string; count?: number }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}><Glyph>{mark}</Glyph><span>{label}</span>{count ? <em>{count}</em> : null}</button>;
}

function Topbar({ view, onMenu, model, setModel, blueprint, onPublish, busy }: { view: View; onMenu: () => void; model: string; setModel: (model: string) => void; blueprint: Blueprint | null; onPublish: () => void; busy: boolean }) {
  const titles: Record<View, string> = { marketplace: "Discover", builder: blueprint?.name || "Agent Builder", auditions: "Audition Arena", teams: "Agent Teams", library: "My agents", activity: "Activity", settings: "Settings" };
  return <header className="topbar"><div className="topbar-title"><button className="menu-button" onClick={onMenu} aria-label="Open menu">☰</button><span className="mobile-brand">✦</span><strong>{titles[view]}</strong>{view === "builder" && <span className="draft-pill">Draft</span>}</div><div className="topbar-actions">{view === "builder" && <><label className="model-picker top-model"><span className="status-dot" /> <select aria-label="Model" value={model} onChange={(event) => setModel(event.target.value)}><option>Auto</option><option>Fast</option><option>Powerful</option></select></label><button className="icon-button" aria-label="Share">↗</button><button className="publish-button" onClick={onPublish} disabled={!blueprint || busy}>{blueprint?.status === "published" ? "Published" : "Publish"}</button></>} {view !== "builder" && <><button className="icon-button search-top" aria-label="Search">⌕</button><button className="avatar-button">AM</button></>}</div></header>;
}

function Marketplace({ query, setQuery, category, setCategory, filtered, onCreate, onTeam, onAudition, prompt, setPrompt, onInstall }: { query: string; setQuery: (value: string) => void; category: string; setCategory: (value: string) => void; filtered: MarketAgent[]; onCreate: (value: string) => void; onTeam: () => void; onAudition: () => void; prompt: string; setPrompt: (value: string) => void; onInstall: (agent: MarketAgent) => void }) {
  const featured = catalog.find((agent) => agent.featured)!;
  return <div className="marketplace-view">
    <section className="market-hero">
      <div className="hero-glow glow-one" /><div className="hero-glow glow-two" />
      <div className="hero-copy"><span className="eyebrow"><i /> THE AGENT MARKETPLACE</span><h1>Discover verified agents.<br/><span>Build evidence-backed teams.</span></h1><p>Describe the outcome you need. Agent Architect turns it into a reviewable package with permissions, evidence, guardrails, wiring, and release readiness.</p></div>
      <form className="hero-composer" onSubmit={(event) => { event.preventDefault(); onCreate(prompt); }}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the agent you want to create…" aria-label="Describe the agent you want to create" rows={2} /><div className="hero-composer-foot"><div><button type="button" className="composer-tool" aria-label="Attach files">＋</button><button type="button" className="context-pill"><span>⌘</span> Add knowledge</button></div><button className="hero-send" aria-label="Create agent" disabled={!prompt.trim()}>↑</button></div></form>
      <div className="prompt-suggestions"><span>Try</span>{quickPrompts.map((item) => <button key={item} onClick={() => onCreate(item)}>{item}<i>↗</i></button>)}<button className="team-prompt-chip" onClick={onTeam}>Build a complete agent team <i>→</i></button><button className="audition-prompt-chip" onClick={onAudition}>Audition architectures <i>→</i></button></div>
    </section>
    <section className="market-content">
      <div className="market-toolbar"><div><h2>Explore agents</h2><p>Curated examples while the verified public catalog is being prepared.</p></div><label className="market-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents" aria-label="Search agents" /></label></div>
      <div className="category-row" aria-label="Agent categories">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      {category === "All" && !query && <button className="featured-card" onClick={() => onInstall(featured)}><div className="featured-copy"><span className="featured-label">CURATED EXAMPLE</span><div className={`agent-icon xl ${featured.accent}`}>{featured.icon}<i>✦</i></div><h3>{featured.name}</h3><p>{featured.description}</p><div className="creator-line"><span className="creator-avatar">N</span><span>Example by {featured.creator}</span></div><div className="featured-actions"><span>View example <i>↗</i></span><small>Sample rating and install data</small></div></div><div className="featured-visual"><div className="brief-window"><div className="window-top"><span/><span/><span/><em>Research brief</em></div><div className="brief-body"><span className="brief-kicker">MARKET LANDSCAPE</span><strong>AI customer support<br/>platforms in 2026</strong><div className="brief-chart"><i/><i/><i/><i/><i/></div><div className="brief-sources"><span>8 sources</span><span>24 insights</span><span>3 recommendations</span></div></div></div><div className="citation-float">Example evidence view</div></div></button>}
      <div className="agents-grid">{filtered.filter((agent) => !(category === "All" && !query && agent.featured)).map((agent) => <AgentCard key={agent.id} agent={agent} onClick={() => onInstall(agent)} />)}</div>
      {!filtered.length && <div className="no-results"><span>⌕</span><h3>No agents found</h3><p>Try another search or create exactly what you need.</p><button onClick={() => onCreate(`Create an agent for ${query || category}`)}>Create this agent</button></div>}
      <div className="creator-banner"><div><span className="eyebrow"><i /> BUILT FOR YOUR WORK</span><h2>Can’t find the right fit?</h2><p>Describe what you need. The Agent Architect will design the prompt, tools, workflow, and safety rules with you.</p><button onClick={() => onCreate("Help me design a custom agent for my business")}>Create a custom agent <span>→</span></button></div><div className="mini-flow"><div className="flow-bubble user">“Handle support in English and Spanish”</div><div className="flow-line"/><div className="flow-orb">✦</div><div className="flow-line"/><div className="flow-bubble result"><i>✓</i><span><strong>Luma Support</strong><small>8 capabilities configured</small></span></div></div></div>
    </section>
  </div>;
}

function AgentCard({ agent, onClick }: { agent: MarketAgent; onClick: () => void }) {
  return <button className="agent-card" onClick={onClick}><div className="card-top"><div className={`agent-icon ${agent.accent}`}>{agent.icon}</div><span className="category-tag">{agent.category}</span></div><h3>{agent.name}</h3><strong>{agent.tagline}</strong><p>{agent.description}</p><div className="tag-list">{agent.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div><div className="card-footer"><span><i className="creator-avatar sm">{agent.creator[0]}</i>{agent.creator}</span><span className="sample-data">Example data</span></div></button>;
}

function AuditionArena({ notify, onInstalled }: { notify: (text: string, tone?: "success" | "neutral") => void; onInstalled: (team: AgentTeam) => void }) {
  const [objective, setObjective] = useState("Handle ecommerce support in English and Uzbek, use current policy evidence, protect refund margins, and require approval before issuing refunds or sending outbound messages.");
  const [audition, setAudition] = useState<AgentAudition | null>(null);
  const [recent, setRecent] = useState<AgentAudition[]>([]);
  const [busy, setBusy] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => { fetch("/api/auditions").then((response) => response.ok ? response.json() : null).then((payload: { auditions?: AgentAudition[] } | null) => setRecent(payload?.auditions || [])).catch(() => undefined); }, []);

  const run = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/auditions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "run", objective }) });
      const payload = await response.json() as { audition?: AgentAudition; error?: string };
      if (!response.ok || !payload.audition) throw new Error(payload.error || "The audition could not run.");
      setAudition(payload.audition);
      setRecent((current) => [payload.audition!, ...current.filter((item) => item.id !== payload.audition!.id)]);
      notify(`${payload.audition.winner.name} won the audition`);
    } catch (error) { notify(error instanceof Error ? error.message : "Audition failed", "neutral"); }
    finally { setBusy(false); }
  };

  const install = async () => {
    if (!audition) return;
    setInstalling(true);
    try {
      const response = await fetch("/api/auditions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "install", id: audition.id }) });
      const payload = await response.json() as { team?: AgentTeam; error?: string; alreadyInstalled?: boolean };
      if (!response.ok || !payload.team) throw new Error(payload.alreadyInstalled ? "This winner is already installed in Agent Teams." : payload.error || "The winning team could not be installed.");
      notify("Winning architecture installed as an editable team");
      onInstalled(payload.team);
    } catch (error) { notify(error instanceof Error ? error.message : "Installation failed", "neutral"); }
    finally { setInstalling(false); }
  };

  if (!audition) return <div className="audition-view">
    <section className="audition-hero"><div className="arena-grid"/><div className="audition-copy"><span className="eyebrow"><i /> PROOF BEFORE INSTALL</span><h1>Make agents<br/><span>earn the job.</span></h1><p>Describe one business outcome. Agent Market creates a synthetic benchmark, stress-tests three architectures, and recommends the smallest configuration that can handle the work safely.</p><div className="arena-principles"><span><i>01</i> Hidden failure cases</span><span><i>02</i> Solo vs team</span><span><i>03</i> Cost-aware winner</span></div></div><div className="arena-preview"><div className="preview-score"><small>WINNING SCORE</small><strong>91</strong><span>Evidence Team</span></div><div className="preview-lane"><span>Solo Specialist</span><i style={{ width: "62%" }}/><b>62</b></div><div className="preview-lane"><span>Guarded Duo</span><i style={{ width: "79%" }}/><b>79</b></div><div className="preview-lane winner"><span>Evidence Team</span><i style={{ width: "91%" }}/><b>91</b></div><p>Illustrative preview · your result is calculated from the objective</p></div></section>
    <section className="audition-start"><div className="audition-form-card"><div className="audition-form-head"><span>01</span><div><h2>Define the job to be done</h2><p>Include the users, systems, constraints, risky actions, and what success means.</p></div></div><textarea value={objective} onChange={(event) => setObjective(event.target.value)} rows={6} aria-label="Outcome to audition"/><div className="benchmark-strip"><span>QUALITY</span><span>EVIDENCE</span><span>SAFETY</span><span>RESILIENCE</span><span>ROUTING</span></div><button className="run-audition" onClick={run} disabled={busy || objective.trim().length < 20}>{busy ? <><i className="button-spinner"/> Building benchmark and running 24 trials…</> : <>Run agent audition <span>→</span></>}</button><small>Synthetic sandbox only. Estimated scores do not represent production performance.</small></div><aside className="audition-explain"><span className="eyebrow"><i /> WHAT GETS TESTED</span>{[{ mark: "◎", title: "Task quality", text: "Does the architecture complete the outcome without losing constraints?" }, { mark: "◫", title: "Evidence behavior", text: "Does it distinguish verified facts, assumptions, and stale information?" }, { mark: "◇", title: "Failure recovery", text: "What happens when a tool, handoff, or required field fails?" }, { mark: "⊘", title: "Permission safety", text: "Does it stop before irreversible or undeclared actions?" }].map((item) => <article key={item.title}><span>{item.mark}</span><div><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</aside></section>
    {recent.length > 0 && <section className="recent-auditions"><div><h2>Recent auditions</h2><span>{recent.length} saved</span></div><div>{recent.slice(0, 4).map((item) => <button key={item.id} onClick={() => setAudition(item)}><span className="recent-score">{item.winner.metrics.overall}</span><span><strong>{item.winner.name}</strong><small>{item.objective}</small></span><i>→</i></button>)}</div></section>}
  </div>;

  return <div className="audition-results-view"><header className="audition-results-head"><div><button onClick={() => setAudition(null)}>← New audition</button><span className="synthetic-pill">SYNTHETIC SANDBOX</span></div><button className="install-winner top" onClick={install} disabled={installing}>{installing ? "Installing…" : "Install winner"}</button></header><main className="audition-results-main"><section className="verdict-card"><div className="winner-medal">✦<small>WINNER</small></div><div className="verdict-copy"><span>RECOMMENDED ARCHITECTURE</span><h1>{audition.winner.name}</h1><p>{audition.verdict}</p><div>{audition.winner.roles.map((role, index) => <span key={role.name}><i>{index + 1}</i>{role.name}</span>)}</div></div><div className="verdict-score"><strong>{audition.winner.metrics.overall}</strong><small>OVERALL</small><span>{audition.winner.metrics.passRate}% weighted pass rate</span></div></section><section className="audition-objective"><span>JOB TO BE DONE</span><p>{audition.objective}</p></section><div className="results-heading"><div><span>02</span><h2>Architecture comparison</h2></div><p>Scores combine scenario outcomes, permissions, handoff reliability, and cost efficiency.</p></div><section className="candidate-grid">{audition.candidates.map((candidate) => <article key={candidate.id} className={candidate.id === audition.winner.id ? "winner" : ""}><header><span className={`candidate-kind ${candidate.kind}`}>{candidate.kind}</span>{candidate.id === audition.winner.id && <b>BEST FIT</b>}</header><h3>{candidate.name}</h3><p>{candidate.summary}</p><div className="candidate-total"><strong>{candidate.metrics.overall}</strong><span><b>Overall score</b><small>{candidate.metrics.passRate}% weighted pass rate</small></span></div><div className="metric-row"><span>Permission safety</span><i><b style={{ width: `${candidate.metrics.permissionScore}%` }}/></i><em>{candidate.metrics.permissionScore}</em></div><div className="metric-row"><span>Handoff reliability</span><i><b style={{ width: `${candidate.metrics.handoffReliability}%` }}/></i><em>{candidate.metrics.handoffReliability}</em></div><div className="candidate-economics"><span><small>EST. COST</small><strong>${candidate.metrics.costPerRun.toFixed(2)}/run</strong></span><span><small>EST. LATENCY</small><strong>{(candidate.metrics.latencyMs / 1000).toFixed(1)}s</strong></span><span><small>ROLES</small><strong>{candidate.roles.length}</strong></span></div><div className="candidate-strengths">{candidate.strengths.map((strength) => <span key={strength}>✓ {strength}</span>)}</div></article>)}</section><div className="results-heading test-heading"><div><span>03</span><h2>Stress-test matrix</h2></div><p>{audition.benchmark.length} cases × {audition.candidates.length} architectures · {audition.benchmark.length * audition.candidates.length} synthetic trials</p></div><section className="stress-matrix"><header><span>Stress case</span>{audition.candidates.map((candidate) => <strong key={candidate.id}>{candidate.name}</strong>)}</header>{audition.benchmark.map((test) => <div className="stress-row" key={test.id}><span><i className={test.category}>{test.category[0].toUpperCase()}</i><b>{test.title}</b><small>{test.detail}</small></span>{audition.candidates.map((candidate) => { const result = candidate.results.find((item) => item.caseId === test.id)!; return <span key={candidate.id} className={`trial-result ${result.status}`} title={result.observation}><i>{result.status === "pass" ? "✓" : result.status === "warning" ? "!" : "×"}</i><b>{result.score}</b><small>{result.status}</small></span>; })}</div>)}</section><section className="winner-rationale"><div><span className="eyebrow"><i /> WHY IT WON</span><h2>Proof you can inspect, not a star rating.</h2><p>{audition.verdict} Replace the synthetic benchmark with anonymized historical cases before production deployment.</p><div>{audition.winner.strengths.map((strength) => <span key={strength}>✓ {strength}</span>)}</div></div><aside><span>WINNING PACKAGE</span><h3>{audition.winner.name}</h3><p>{audition.winner.roles.length} editable roles · explicit handoffs · audition evidence attached</p><button className="install-winner" onClick={install} disabled={installing}>{installing ? "Installing winner…" : <>Install as editable team <span>→</span></>}</button><small>No external actions are connected during installation.</small></aside></section></main></div>;
}

function Builder({ messages, blueprint, prompt, setPrompt, submit, createAgent, busy, webEnabled, setWebEnabled, model, setModel, composerRef, onPublish }: { messages: ChatMessage[]; blueprint: Blueprint | null; prompt: string; setPrompt: (value: string) => void; submit: (event: FormEvent) => void; createAgent: (value: string) => void; busy: boolean; webEnabled: boolean; setWebEnabled: (value: boolean) => void; model: string; setModel: (value: string) => void; composerRef: React.RefObject<HTMLTextAreaElement | null>; onPublish: () => void }) {
  return <div className={`builder-view ${blueprint ? "has-blueprint" : ""}`}>
    <section className="chat-pane">
      <div className="conversation"><div className="conversation-inner">{messages.map((message) => <div key={message.id} className={`message ${message.role}`}>
        {message.role === "architect" && <span className="architect-avatar">✦</span>}
        <div className="message-body">{message.role === "architect" && <strong>Agent Architect</strong>}<p>{message.text}</p>{message.id === "welcome" && messages.length === 1 && <div className="builder-suggestions">{quickPrompts.map((item) => <button key={item} onClick={() => createAgent(item)}><span>✦</span>{item}<i>→</i></button>)}</div>}</div>
      </div>)}{busy && <div className="message architect"><span className="architect-avatar thinking">✦</span><div className="message-body"><strong>Agent Architect</strong><div className="thinking-line"><i/><i/><i/><span>Designing the blueprint</span></div></div></div>}</div></div>
      <div className="chat-composer-wrap"><form className="chat-composer" onSubmit={submit}><textarea ref={composerRef} value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (prompt.trim()) createAgent(prompt); } }} placeholder={blueprint ? `Ask to refine ${blueprint.name}…` : "Describe your agent…"} rows={2} aria-label="Message Agent Architect"/><div className="chat-composer-bottom"><div><button type="button" className="round-tool" aria-label="Attach file">＋</button><button type="button" className={`web-toggle ${webEnabled ? "on" : ""}`} onClick={() => setWebEnabled(!webEnabled)}><span>◎</span> Web</button><label className="model-picker"><select value={model} onChange={(event) => setModel(event.target.value)} aria-label="Builder model"><option>Auto</option><option>Fast</option><option>Powerful</option></select></label></div><div><button type="button" className="mic-button" aria-label="Voice input">◉</button><button className="send-button" aria-label="Send message" disabled={!prompt.trim() || busy}>↑</button></div></div></form><p className="composer-note">Agent Architect can make mistakes. Review tools and permissions before publishing.</p></div>
    </section>
    {blueprint && <BlueprintPanel blueprint={blueprint} onPublish={onPublish} busy={busy} />}
  </div>;
}

function BlueprintPanel({ blueprint, onPublish, busy }: { blueprint: Blueprint; onPublish: () => void; busy: boolean }) {
  const [tab, setTab] = useState<"overview" | "trust" | "prompt" | "test">("overview");
  const [testText, setTestText] = useState(blueprint.starters[0] || "Hello");
  const [testResult, setTestResult] = useState("");
  const manifest = blueprint.package;
  return <aside className="blueprint-panel"><div className="blueprint-head"><div><span>AGENT PACKAGE · {manifest.version ? `V${manifest.version}` : "DRAFT"}</span><h2>{blueprint.name}</h2></div><div className="blueprint-actions"><button aria-label="More actions">•••</button><button aria-label="Close blueprint">×</button></div></div><div className="blueprint-tabs"><button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button><button className={tab === "trust" ? "active" : ""} onClick={() => setTab("trust")}>Trust & readiness</button><button className={tab === "prompt" ? "active" : ""} onClick={() => setTab("prompt")}>Instructions</button><button className={tab === "test" ? "active" : ""} onClick={() => setTab("test")}>Test</button></div>
    {tab === "overview" && <div className="blueprint-body"><div className="agent-identity"><div className={`agent-icon lg ${blueprint.accent}`}>{blueprint.icon}</div><div><h3>{blueprint.name}</h3><p>{blueprint.tagline}</p><span className="draft-state"><i /> {blueprint.status === "published" ? `Published revision v${manifest.version}` : "Editable package draft"}</span></div></div><button className="readiness-banner" onClick={() => setTab("trust")}><span className="readiness-score">{manifest.readiness.score}<small>/100</small></span><span><strong>Release readiness</strong><small>{manifest.readiness.dimensions.filter((item) => item.state === "ready").length} ready · {manifest.readiness.dimensions.filter((item) => item.state === "review").length} need review · {manifest.readiness.dimensions.filter((item) => item.state === "missing").length} missing</small></span><i>Review →</i></button><SpecBlock title="Purpose"><p>{blueprint.purpose}</p></SpecBlock><SpecBlock title="Workflow"><div className="workflow-list">{blueprint.steps.map((step, index) => <div key={step.title}><span>{index + 1}</span><p><strong>{step.title}</strong><small>{step.detail}</small></p></div>)}</div></SpecBlock><SpecBlock title="Tools" action="Manage"><div className="capability-list">{blueprint.tools.map((tool) => <span key={tool}><i>{tool[0]}</i>{tool}<b>✓</b></span>)}</div></SpecBlock><SpecBlock title="Channels" action="Connect"><div className="chip-list">{blueprint.channels.map((channel) => <span key={channel}>{channel}</span>)}</div></SpecBlock><SpecBlock title="Guardrails"><ul className="guardrail-list">{blueprint.guardrails.map((rule) => <li key={rule}><span>✓</span>{rule}</li>)}</ul></SpecBlock><SpecBlock title="Conversation starters"><div className="starter-list">{blueprint.starters.map((starter) => <button key={starter}>{starter}<span>↗</span></button>)}</div></SpecBlock></div>}
    {tab === "trust" && <div className="blueprint-body trust-body"><div className="trust-overview"><div className="score-ring" style={{ "--score": `${manifest.readiness.score * 3.6}deg` } as React.CSSProperties}><strong>{manifest.readiness.score}</strong><small>READY</small></div><div><span>PACKAGE READINESS</span><h3>{manifest.release.immutable ? `Immutable revision v${manifest.version}` : "Review before publishing"}</h3><p>{manifest.readiness.evidenceCoverage}% evidence coverage · schema {manifest.schemaVersion}</p></div></div><div className="readiness-grid">{manifest.readiness.dimensions.map((item) => <div key={item.id} className={`readiness-item ${item.state}`}><span>{item.state === "ready" ? "✓" : item.state === "review" ? "!" : "—"}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div><em>{item.state}</em></div>)}</div><SpecBlock title="Evidence ledger"><div className="evidence-list">{manifest.evidence.map((item) => <article key={item.id}><header><span className={`evidence-status ${item.status}`}>{item.status.replace("-", " ")}</span><small>{Math.round(item.confidence * 100)}% confidence</small></header><p>{item.claim}</p><footer>Affects {item.affects.join(" · ")}</footer></article>)}</div></SpecBlock><SpecBlock title="Permission manifest"><div className="permission-sheet"><PermissionGroup title="Can read" tone="read" items={manifest.permissions.read}/><PermissionGroup title="With approval" tone="approval" items={manifest.permissions.withApproval}/><PermissionGroup title="Cannot" tone="denied" items={manifest.permissions.denied}/></div></SpecBlock><div className="package-contract"><span>INTEROPERABILITY</span><strong>A2A {manifest.interoperability.a2a === "valid" ? "validated" : "not configured"}</strong><p>{manifest.interoperability.mcpTools.length ? `${manifest.interoperability.mcpTools.length} MCP tools declared` : "MCP tool bindings can be added after connections are authenticated."}</p></div></div>}
    {tab === "prompt" && <div className="blueprint-body"><div className="prompt-editor-head"><span>System instructions</span><button>Copy</button></div><pre className="prompt-preview">{blueprint.systemPrompt}</pre><SpecBlock title="Knowledge plan"><div className="knowledge-list">{blueprint.knowledge.map((item) => <div key={item}><span>◫</span><p><strong>{item}</strong><small>Recommended source</small></p><button>＋</button></div>)}</div></SpecBlock></div>}
    {tab === "test" && <div className="blueprint-body test-body"><div className="test-stage"><div className="test-agent"><span className={`mini-avatar ${blueprint.accent}`}>{blueprint.icon}</span><div><strong>{blueprint.name}</strong><small>Preview sandbox</small></div></div>{testResult && <div className="test-response"><span className={`mini-avatar ${blueprint.accent}`}>{blueprint.icon}</span><p>{testResult}</p></div>}<div className="test-compose"><textarea value={testText} onChange={(event) => setTestText(event.target.value)} rows={3}/><button onClick={() => setTestResult(`I’ll handle that as ${blueprint.name}. I’ll first confirm the goal and required context, then use only the approved tools and return a clear next step.`)}>↑</button></div></div><p className="sandbox-note">Sandbox runs do not trigger external actions.</p></div>}
    <div className="blueprint-footer"><span className="package-version">{manifest.release.immutable ? `v${manifest.version} · immutable` : "Draft · editable"}</span><button className="secondary-action" onClick={() => setTab("trust")}>Review readiness</button><button className="primary-action" onClick={onPublish} disabled={busy}>{blueprint.status === "published" ? "Publish new revision" : "Publish package"}</button></div>
  </aside>;
}

function PermissionGroup({ title, tone, items }: { title: string; tone: "read" | "approval" | "denied"; items: string[] }) {
  return <section className={`permission-group ${tone}`}><h5>{title}</h5>{items.map((item) => <p key={item}><span>{tone === "read" ? "✓" : tone === "approval" ? "!" : "×"}</span>{item}</p>)}</section>;
}

function SpecBlock({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return <section className="spec-block"><div className="spec-title"><h4>{title}</h4>{action && <button>{action}</button>}</div>{children}</section>;
}

function TeamStudio({ teams, setTeams, activeTeam, setActiveTeam, model, notify }: { teams: AgentTeam[]; setTeams: React.Dispatch<React.SetStateAction<AgentTeam[]>>; activeTeam: AgentTeam | null; setActiveTeam: (team: AgentTeam | null) => void; model: string; notify: (text: string, tone?: "success" | "neutral") => void }) {
  const [mode, setMode] = useState<"prompt" | "manual">("prompt");
  const [brief, setBrief] = useState("Create a complete marketing team for a growing ecommerce brand. Research our audience and competitors, create content across Instagram and email, run campaigns, measure results, and continuously improve.");
  const [website, setWebsite] = useState("");
  const [teamName, setTeamName] = useState("Marketing Growth Team");
  const [roles, setRoles] = useState(["Marketing Lead", "Audience Researcher", "Content Strategist", "Creative Producer", "Performance Analyst"]);
  const [roleInput, setRoleInput] = useState("");
  const [stage, setStage] = useState<"research" | "members" | "wiring" | "runbook">("research");
  const [busy, setBusy] = useState(false);
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("verified handoff");

  const remember = (team: AgentTeam) => {
    setActiveTeam(team);
    setTeams((current) => [team, ...current.filter((item) => item.id !== team.id)]);
  };

  const generate = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/teams", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "generate", prompt: brief, website, model }) });
      const payload = await response.json() as { team?: AgentTeam; error?: string };
      if (!response.ok || !payload.team) throw new Error(payload.error || "The team could not be created.");
      remember(payload.team);
      setStage("research");
      notify(`${payload.team.name} researched and created`);
    } catch (error) { notify(error instanceof Error ? error.message : "Team creation failed", "neutral"); }
    finally { setBusy(false); }
  };

  const createManual = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/teams", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "manual", prompt: brief, name: teamName, roles }) });
      const payload = await response.json() as { team?: AgentTeam; error?: string };
      if (!response.ok || !payload.team) throw new Error(payload.error || "The team could not be created.");
      remember(payload.team);
      setStage("members");
      notify("Manual team workspace created");
    } catch (error) { notify(error instanceof Error ? error.message : "Team creation failed", "neutral"); }
    finally { setBusy(false); }
  };

  const replaceTeam = (next: AgentTeam) => {
    setActiveTeam(next);
    setTeams((current) => current.map((item) => item.id === next.id ? next : item));
  };

  const persist = async (action: "save" | "publish" = "save") => {
    if (!activeTeam) return;
    setBusy(true);
    try {
      const response = await fetch("/api/teams", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, team: activeTeam }) });
      const payload = await response.json() as { team?: AgentTeam; error?: string };
      if (!response.ok || !payload.team) throw new Error(payload.error || "The team could not be saved.");
      replaceTeam(payload.team);
      notify(action === "publish" ? `${payload.team.name} published` : "Team architecture saved");
    } catch (error) { notify(error instanceof Error ? error.message : "Save failed", "neutral"); }
    finally { setBusy(false); }
  };

  const updateMember = (id: string, field: "name" | "role" | "purpose", value: string) => {
    if (!activeTeam) return;
    replaceTeam({ ...activeTeam, agents: activeTeam.agents.map((agent) => agent.id === id ? { ...agent, [field]: value, ...(field === "name" ? { icon: value[0]?.toUpperCase() || "A" } : {}) } : agent) });
  };

  const addMember = () => {
    if (!activeTeam) return;
    const index = activeTeam.agents.length;
    const member: TeamAgent = { id: `member_${crypto.randomUUID()}`, name: `Specialist ${index + 1}`, role: "New specialist", purpose: "Own one bounded responsibility and return a verified result to the team.", icon: "S", accent: ["violet", "sky", "pink", "orange", "emerald", "indigo"][index % 6], tools: ["Workspace memory"], inputs: ["Assigned task", "Team context"], outputs: ["Verified result", "Open questions"], guardrails: ["Stay within assigned ownership", "Include evidence with every handoff"] };
    replaceTeam({ ...activeTeam, agents: [...activeTeam.agents, member] });
  };

  const removeMember = (id: string) => {
    if (!activeTeam) return;
    replaceTeam({ ...activeTeam, agents: activeTeam.agents.filter((agent) => agent.id !== id), edges: activeTeam.edges.filter((edge) => edge.from !== id && edge.to !== id) });
  };

  const addConnection = () => {
    if (!activeTeam || !edgeFrom || !edgeTo || edgeFrom === edgeTo) return;
    const source = activeTeam.agents.find((agent) => agent.id === edgeFrom);
    const edge: TeamEdge = { id: `edge_${crypto.randomUUID()}`, from: edgeFrom, to: edgeTo, label: edgeLabel.trim() || "handoff", condition: "Required inputs are present and the source result passed its checks", payload: source?.outputs.slice(0, 2) || ["Verified result"] };
    replaceTeam({ ...activeTeam, edges: [...activeTeam.edges, edge] });
    setEdgeTo("");
    notify("Connection added");
  };

  const updateEdge = (id: string, field: "from" | "to" | "label" | "condition", value: string) => {
    if (!activeTeam) return;
    replaceTeam({ ...activeTeam, edges: activeTeam.edges.map((edge) => edge.id === id ? { ...edge, [field]: value } : edge) });
  };

  if (!activeTeam) return <div className="team-create-view">
    <section className="team-create-hero"><div><span className="eyebrow"><i /> MULTI-AGENT CREATOR</span><h1>Build the team,<br/><span>not just the agents.</span></h1><p>Start with one outcome. Agent Architect researches the domain, defines the right specialists, and wires their handoffs into one working system.</p></div><div className="team-architecture-preview"><div className="preview-core">✦<small>Lead</small></div>{["Research", "Strategy", "Create", "Measure"].map((item, index) => <div key={item} className={`preview-member pm-${index + 1}`}><i>{item[0]}</i><span>{item}</span></div>)}</div></section>
    <section className="team-create-content"><div className="team-mode-tabs"><button className={mode === "prompt" ? "active" : ""} onClick={() => setMode("prompt")}><span>✦</span><strong>Build with one prompt</strong><small>Research, roles, and wiring included</small></button><button className={mode === "manual" ? "active" : ""} onClick={() => setMode("manual")}><span>＋</span><strong>Build manually</strong><small>Choose every role and connection</small></button></div>
      {mode === "prompt" ? <div className="team-prompt-card"><div className="team-card-heading"><div><span>01</span><h2>Describe the outcome</h2></div><p>Explain the business goal, audience, channels, constraints, and what success should look like.</p></div><textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={6} aria-label="Describe the agent team"/><div className="research-source"><label htmlFor="team-company-website"><span>◎</span><div><strong>Company website</strong><small>Ground the team in your real offer and language</small></div></label><input id="team-company-website" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://yourcompany.com (optional)" /></div><div className="research-options"><span><i>✓</i> Domain research</span><span><i>✓</i> Role gap analysis</span><span><i>✓</i> Handoff contracts</span><span><i>✓</i> Feedback loop</span></div><button className="research-create-button" onClick={generate} disabled={busy || brief.trim().length < 20}>{busy ? <><i className="button-spinner"/> Researching before design…</> : <>Research & create team <span>→</span></>}</button></div> : <div className="manual-team-card"><div className="manual-team-fields"><label><span>Team name</span><input value={teamName} onChange={(event) => setTeamName(event.target.value)} /></label><label><span>Shared objective</span><textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={3}/></label></div><div className="manual-role-builder"><div className="manual-role-head"><div><h3>Team roles</h3><p>Add specialists now. You can edit tools and wiring next.</p></div><span>{roles.length} roles</span></div><div className="role-chip-grid">{roles.map((role, index) => <div key={`${role}-${index}`}><span className={`mini-avatar ${["violet", "sky", "pink", "orange", "emerald", "indigo"][index % 6]}`}>{role[0]}</span><input value={role} onChange={(event) => setRoles((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}/><button onClick={() => setRoles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}</div><div className="add-role-row"><input value={roleInput} onChange={(event) => setRoleInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && roleInput.trim()) { setRoles((current) => [...current, roleInput.trim()]); setRoleInput(""); } }} placeholder="Add another role…"/><button onClick={() => { if (roleInput.trim()) { setRoles((current) => [...current, roleInput.trim()]); setRoleInput(""); } }}>＋ Add role</button></div></div><button className="research-create-button" onClick={createManual} disabled={busy || roles.length < 2}>{busy ? "Creating workspace…" : <>Open team workspace <span>→</span></>}</button></div>}
      {teams.length > 0 && <div className="existing-teams"><div className="existing-head"><h2>Your teams</h2><span>{teams.length} saved</span></div><div className="team-library-grid">{teams.map((team) => <button key={team.id} onClick={() => { setActiveTeam(team); setStage("research"); }}><div className="team-stack">{team.agents.slice(0, 4).map((agent, index) => <i key={agent.id} className={agent.accent} style={{ zIndex: 5 - index }}>{agent.icon}</i>)}</div><h3>{team.name}</h3><p>{team.agents.length} agents · {team.edges.length} connections</p><span className={`team-status ${team.status}`}>{team.status}</span></button>)}</div></div>}
    </section>
  </div>;

  const lead = activeTeam.agents[0];
  return <div className="team-workbench"><header className="team-workbench-head"><div className="team-title-row"><button className="back-teams" onClick={() => setActiveTeam(null)}>←</button><div className="team-stack small">{activeTeam.agents.slice(0, 4).map((agent, index) => <i key={agent.id} className={agent.accent} style={{ zIndex: 5 - index }}>{agent.icon}</i>)}</div><div><span>AGENT TEAM</span><h1>{activeTeam.name}</h1></div><span className={`team-status ${activeTeam.status}`}><i /> {activeTeam.status}</span></div><div><button className="save-team" onClick={() => persist("save")} disabled={busy}>Save</button><button className="publish-team" onClick={() => persist("publish")} disabled={busy}>{activeTeam.status === "published" ? "Published ✓" : "Publish team"}</button></div></header>
    <nav className="team-stage-tabs"><button className={stage === "research" ? "active" : ""} onClick={() => setStage("research")}><span>01</span> Research <i className="complete">✓</i></button><button className={stage === "members" ? "active" : ""} onClick={() => setStage("members")}><span>02</span> Team <em>{activeTeam.agents.length}</em></button><button className={stage === "wiring" ? "active" : ""} onClick={() => setStage("wiring")}><span>03</span> Wiring <em>{activeTeam.edges.length}</em></button><button className={stage === "runbook" ? "active" : ""} onClick={() => setStage("runbook")}><span>04</span> Runbook</button></nav>
    <div className="team-stage-body">
      {stage === "research" && <div className="research-stage"><div className="stage-intro"><span className="eyebrow"><i /> RESEARCH BEFORE ARCHITECTURE</span><h2>Evidence used to design this team</h2><p>{activeTeam.research.summary}</p></div><div className="research-mode-card"><div className={`research-mode-icon ${activeTeam.research.mode}`}>{activeTeam.research.mode === "live-ai" ? "◎" : activeTeam.research.mode === "site-evidence" ? "⌂" : "◫"}</div><div><strong>{activeTeam.research.mode === "live-ai" ? "Live web research" : activeTeam.research.mode === "site-evidence" ? "Company website evidence" : activeTeam.research.mode === "manual" ? "Manual architecture" : "Domain architecture research"}</strong><span>{new Date(activeTeam.research.completedAt).toLocaleString()}</span></div><b>{activeTeam.research.findings.length} findings</b></div><div className="research-findings">{activeTeam.research.findings.map((finding, index) => <article key={`${finding.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><div><h3>{finding.title}</h3><em className={finding.confidence}>{finding.confidence}</em></div><p>{finding.detail}</p></div></article>)}</div>{activeTeam.research.sources.length > 0 && <section className="research-sources"><h3>Evidence sources</h3>{activeTeam.research.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>↗</span><div><strong>{source.title}</strong><small>{source.url}</small></div></a>)}</section>}<section className="research-gaps"><h3>Evidence gaps</h3>{activeTeam.research.gaps.map((gap) => <p key={gap}><span>!</span>{gap}</p>)}</section><button className="next-stage" onClick={() => setStage("members")}>Review the team <span>→</span></button></div>}
      {stage === "members" && <div className="members-stage"><div className="stage-heading-row"><div><span className="eyebrow"><i /> BOUNDED OWNERSHIP</span><h2>{activeTeam.agents.length} specialists, one shared outcome</h2><p>Each agent owns a distinct responsibility and exposes explicit inputs and outputs.</p></div><button onClick={addMember}>＋ Add agent</button></div><div className="team-member-grid">{activeTeam.agents.map((agent, index) => <article className="team-member-card" key={agent.id}><div className="member-card-top"><span className={`agent-icon ${agent.accent}`}>{agent.icon}</span><div><span>{index === 0 ? "ORCHESTRATOR" : `SPECIALIST ${String(index).padStart(2, "0")}`}</span><input value={agent.name} onChange={(event) => updateMember(agent.id, "name", event.target.value)}/></div><button onClick={() => removeMember(agent.id)} disabled={activeTeam.agents.length <= 2}>×</button></div><label><span>Role</span><input value={agent.role} onChange={(event) => updateMember(agent.id, "role", event.target.value)}/></label><label><span>Purpose</span><textarea value={agent.purpose} onChange={(event) => updateMember(agent.id, "purpose", event.target.value)} rows={3}/></label><div className="member-contract"><div><span>INPUTS</span>{agent.inputs.slice(0, 3).map((item) => <i key={item}>{item}</i>)}</div><b>→</b><div><span>OUTPUTS</span>{agent.outputs.slice(0, 3).map((item) => <i key={item}>{item}</i>)}</div></div><div className="member-tools"><span>TOOLS</span>{agent.tools.map((tool) => <i key={tool}>{tool}</i>)}</div></article>)}</div><button className="next-stage" onClick={() => setStage("wiring")}>Wire the handoffs <span>→</span></button></div>}
      {stage === "wiring" && <div className="wiring-stage"><div className="stage-heading-row"><div><span className="eyebrow"><i /> EXECUTABLE CONNECTIONS</span><h2>Every arrow has a contract</h2><p>A connection defines who hands off, when it can happen, and exactly what data moves.</p></div><button onClick={() => persist("save")}>Save wiring</button></div><div className="wiring-canvas"><div className="canvas-grid"/><div className="lead-node">{lead && <><span className={`agent-icon ${lead.accent}`}>{lead.icon}</span><div><small>TEAM ORCHESTRATOR</small><strong>{lead.name}</strong><em>{activeTeam.edges.filter((edge) => edge.from === lead.id || edge.to === lead.id).length} connections</em></div></>}</div><div className="lead-rail"><span>delegates</span><i>↓</i></div><div className="team-node-grid">{activeTeam.agents.slice(1).map((agent) => <div className="wire-node" key={agent.id}><span className={`mini-avatar ${agent.accent}`}>{agent.icon}</span><div><strong>{agent.name}</strong><small>{agent.role}</small></div><em>{activeTeam.edges.filter((edge) => edge.from === agent.id || edge.to === agent.id).length}</em></div>)}</div><div className="feedback-rail"><i>↖</i><span>verified outputs and learning return to the team state</span><i>↗</i></div></div><section className="connection-editor"><div className="connection-head"><div><h3>Handoff contracts</h3><p>These connections are saved with the team and validated before publishing.</p></div><span>{activeTeam.edges.length} active</span></div><div className="connection-list">{activeTeam.edges.map((edge, index) => <div className="connection-row" key={edge.id}><span className="connection-number">{String(index + 1).padStart(2, "0")}</span><div className="connection-route"><select value={edge.from} onChange={(event) => updateEdge(edge.id, "from", event.target.value)}>{activeTeam.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select><i>→</i><select value={edge.to} onChange={(event) => updateEdge(edge.id, "to", event.target.value)}>{activeTeam.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></div><label><span>HANDOFF</span><input value={edge.label} onChange={(event) => updateEdge(edge.id, "label", event.target.value)}/></label><label><span>CONDITION</span><input value={edge.condition} onChange={(event) => updateEdge(edge.id, "condition", event.target.value)}/></label><div className="payload-chips"><span>PAYLOAD</span>{edge.payload.map((item) => <i key={item}>{item}</i>)}</div><button className="remove-edge" onClick={() => replaceTeam({ ...activeTeam, edges: activeTeam.edges.filter((item) => item.id !== edge.id) })}>×</button></div>)}</div><div className="add-connection"><select value={edgeFrom} onChange={(event) => setEdgeFrom(event.target.value)}><option value="">From agent…</option>{activeTeam.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select><span>→</span><select value={edgeTo} onChange={(event) => setEdgeTo(event.target.value)}><option value="">To agent…</option>{activeTeam.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select><input value={edgeLabel} onChange={(event) => setEdgeLabel(event.target.value)} placeholder="Handoff label"/><button onClick={addConnection} disabled={!edgeFrom || !edgeTo || edgeFrom === edgeTo}>＋ Add connection</button></div></section><button className="next-stage" onClick={() => setStage("runbook")}>Review runbook <span>→</span></button></div>}
      {stage === "runbook" && <div className="runbook-stage"><div className="stage-intro"><span className="eyebrow"><i /> TEAM OPERATING SYSTEM</span><h2>Shared context and success contract</h2><p>The runbook keeps the agents aligned after the visual design is complete.</p></div><div className="runbook-grid"><RunbookBlock title="Shared knowledge" mark="◫" items={activeTeam.sharedKnowledge}/><RunbookBlock title="Triggers" mark="⚡" items={activeTeam.triggers}/><RunbookBlock title="Success metrics" mark="↗" items={activeTeam.successMetrics}/><RunbookBlock title="Connected channels" mark="◎" items={activeTeam.channels}/></div><section className="publish-checklist"><div><h3>Release readiness</h3><p>The team needs agents, connections, and reviewed evidence before publishing.</p></div><span className={activeTeam.agents.length >= 2 ? "pass" : ""}>✓ {activeTeam.agents.length} agents defined</span><span className={activeTeam.edges.length > 0 ? "pass" : ""}>✓ {activeTeam.edges.length} handoffs connected</span><span className={activeTeam.research.findings.length > 0 ? "pass" : ""}>✓ Research reviewed</span></section><button className="runbook-publish" onClick={() => persist("publish")} disabled={busy || activeTeam.edges.length === 0}>{activeTeam.status === "published" ? "Team is published ✓" : "Publish agent team"}</button></div>}
    </div>
  </div>;
}

function RunbookBlock({ title, mark, items }: { title: string; mark: string; items: string[] }) {
  return <section><div><span>{mark}</span><h3>{title}</h3></div>{items.map((item) => <p key={item}><i>✓</i>{item}</p>)}</section>;
}

function Library({ agents, onOpen, onNew }: { agents: Blueprint[]; onOpen: (agent: Blueprint) => void; onNew: () => void }) {
  return <div className="standard-view"><div className="page-heading"><div><span className="eyebrow"><i /> YOUR WORKSPACE</span><h1>My agents</h1><p>Draft, evaluate, version, and manage every Agent Package you create.</p></div><button className="primary-page-action" onClick={onNew}>＋ Create agent</button></div>{agents.length ? <div className="library-grid">{agents.map((agent) => <button className="library-card" key={agent.id} onClick={() => onOpen(agent)}><div className="library-card-head"><div className={`agent-icon ${agent.accent}`}>{agent.icon}</div><span className={`library-status ${agent.status}`}><i /> {agent.status}{agent.package.version ? ` v${agent.package.version}` : ""}</span></div><h3>{agent.name}</h3><p>{agent.tagline}</p><div className="library-readiness"><strong>{agent.package.readiness.score}</strong><span><b>Readiness</b><small>{agent.package.readiness.evidenceCoverage}% evidence coverage</small></span></div><div className="library-tools">{agent.tools.slice(0, 3).map((tool) => <span key={tool}>{tool}</span>)}</div><div className="library-foot"><span>Edited {new Date(agent.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><i>→</i></div></button>)}</div> : <div className="empty-library"><div className="empty-orb">✦</div><h2>Your first agent starts with one sentence.</h2><p>Describe the outcome you want. Agent Architect will configure everything else with you.</p><button onClick={onNew}>Create your first agent</button></div>}</div>;
}

function Activity({ agents }: { agents: Blueprint[] }) {
  const rows = agents.flatMap((agent) => [{ type: "created", agent, label: "Blueprint created", detail: "Purpose, tools, guardrails, and workflow configured" }, ...(agent.status === "published" ? [{ type: "published", agent, label: "Agent published", detail: "Available in your workspace library" }] : [])]);
  return <div className="standard-view narrow"><div className="page-heading"><div><span className="eyebrow"><i /> WORKSPACE LOG</span><h1>Activity</h1><p>A transparent record of builds, tests, and releases.</p></div></div><div className="activity-panel"><div className="activity-filter"><button className="active">All activity</button><button>Builds</button><button>Releases</button><button>Runs</button></div>{rows.length ? rows.map((row, index) => <div className="activity-row" key={`${row.agent.id}-${row.type}`}><div className={`activity-mark ${row.type}`}>{row.type === "published" ? "↑" : "✦"}</div><div><strong>{row.label}</strong><p>{row.agent.name} · {row.detail}</p></div><time>{index ? "Recently" : "Just now"}</time></div>) : <div className="activity-empty"><span>↗</span><h3>No activity yet</h3><p>Your build history will appear here.</p></div>}</div></div>;
}

function Settings({ model, setModel, webEnabled, setWebEnabled, notify }: { model: string; setModel: (value: string) => void; webEnabled: boolean; setWebEnabled: (value: boolean) => void; notify: (text: string) => void }) {
  return <div className="standard-view settings-view"><div className="page-heading"><div><span className="eyebrow"><i /> PERSONAL WORKSPACE</span><h1>Settings</h1><p>Manage defaults, permissions, and connected knowledge.</p></div></div><div className="settings-layout"><nav><button className="active">General</button><button>Models</button><button>Connections</button><button>Knowledge</button><button>Privacy</button><button>Billing</button></nav><div className="settings-card"><section><div><h3>Default model</h3><p>Choose how Agent Architect balances speed and reasoning.</p></div><select value={model} onChange={(event) => setModel(event.target.value)}><option>Auto</option><option>Fast</option><option>Powerful</option></select></section><section><div><h3>Web research</h3><p>Allow new agents to use current public information by default.</p></div><button className={`switch ${webEnabled ? "on" : ""}`} onClick={() => setWebEnabled(!webEnabled)} aria-label="Toggle web research"><i /></button></section><section><div><h3>Publishing approval</h3><p>Require a final human review before an agent can act outside the sandbox.</p></div><button className="switch on" aria-label="Publishing approval enabled"><i /></button></section><section className="connection-row"><div><h3>Connected knowledge</h3><p>Documents, websites, and data sources available to your agents.</p></div><button onClick={() => notify("Knowledge connector ready")}>Manage sources <span>→</span></button></section><div className="settings-save"><span>Changes are saved automatically.</span><button onClick={() => notify("Settings saved")}>Save changes</button></div></div></div></div>;
}

function AgentModal({ agent, onClose, onUse }: { agent: MarketAgent; onClose: () => void; onUse: () => void }) {
  return <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={`${agent.name} details`}><button className="modal-backdrop" onClick={onClose} aria-label="Close dialog"/><div className="agent-modal"><div className={`modal-hero ${agent.accent}`}><button className="modal-close" onClick={onClose} aria-label="Close">×</button><div className={`agent-icon hero-icon ${agent.accent}`}>{agent.icon}</div><span>{agent.category} · CURATED EXAMPLE</span><h2>{agent.name}</h2><p>{agent.tagline}</p></div><div className="modal-content"><div className="modal-creator"><span className="creator-avatar">{agent.creator[0]}</span><span><strong>{agent.creator}</strong><small>Example creator profile</small></span></div><p className="modal-description">{agent.description}</p><div className="sample-disclosure"><strong>Example listing</strong><p>Ratings and install counts below are illustrative data, not live marketplace telemetry.</p></div><div className="modal-stats"><div><strong>{agent.rating}</strong><span>sample rating</span></div><div><strong>{formatInstalls(agent.installs)}</strong><span>sample installs</span></div><div><strong>{agent.tags.length + 3}</strong><span>capabilities</span></div></div><h3>What it can do</h3><div className="modal-capabilities">{agent.tags.map((tag) => <span key={tag}><i>✓</i>{tag}</span>)}<span><i>✓</i>Custom instructions</span><span><i>✓</i>Human handoff</span></div><div className="modal-actions"><button className="modal-secondary" onClick={onClose}>Close</button><button className="modal-primary" onClick={onUse}>Create private copy <span>→</span></button></div><small className="modal-note">The copy becomes a private, editable Agent Package with its own readiness review.</small></div></div></div>;
}
