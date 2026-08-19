"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type View = "marketplace" | "builder" | "library" | "activity" | "settings";
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
  updatedAt: string;
};
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
      const response = await fetch("/api/marketplace");
      if (!response.ok) return;
      const payload = await response.json() as { agents?: Blueprint[] };
      setSavedAgents(payload.agents || []);
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
        text: `I built ${payload.agent!.name}. It has a complete operating prompt, ${payload.agent!.tools.length} tools, ${payload.agent!.guardrails.length} safety rules, and a ${payload.agent!.steps.length}-step workflow. Review the blueprint, then test or publish it.`,
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
      if (!response.ok) throw new Error("Publishing is temporarily unavailable.");
      const updated = { ...blueprint, status: "published" as const };
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
      <Sidebar view={view} setView={setView} open={sidebarOpen} setOpen={setSidebarOpen} onNew={startNew} savedAgents={savedAgents} />
      <section className="app-main">
        <Topbar view={view} onMenu={() => setSidebarOpen(true)} model={model} setModel={setModel} blueprint={blueprint} onPublish={publish} busy={busy} />
        {view === "marketplace" && <Marketplace query={query} setQuery={setQuery} category={category} setCategory={setCategory} filtered={filtered} onCreate={createAgent} prompt={prompt} setPrompt={setPrompt} onInstall={installAgent} />}
        {view === "builder" && <Builder messages={messages} blueprint={blueprint} prompt={prompt} setPrompt={setPrompt} submit={submitPrompt} createAgent={createAgent} busy={busy} webEnabled={webEnabled} setWebEnabled={setWebEnabled} model={model} setModel={setModel} composerRef={composerRef} onPublish={publish} />}
        {view === "library" && <Library agents={savedAgents} onOpen={(agent) => { setBlueprint(agent); setMessages([...initialMessages, { id: crypto.randomUUID(), role: "architect", text: `${agent.name} is open. Ask me to change its behavior, tools, knowledge, or guardrails.` }]); setView("builder"); }} onNew={startNew} />}
        {view === "activity" && <Activity agents={savedAgents} />}
        {view === "settings" && <Settings model={model} setModel={setModel} webEnabled={webEnabled} setWebEnabled={setWebEnabled} notify={notify} />}
      </section>
      {detailsOpen && selectedAgent && <AgentModal agent={selectedAgent} onClose={() => setDetailsOpen(false)} onUse={useTemplate} />}
      {toast && <div className={`toast ${toast.tone}`} role="status"><span>✓</span>{toast.text}</div>}
    </main>
  );
}

function Sidebar({ view, setView, open, setOpen, onNew, savedAgents }: { view: View; setView: (view: View) => void; open: boolean; setOpen: (open: boolean) => void; onNew: () => void; savedAgents: Blueprint[] }) {
  const navigate = (next: View) => { setView(next); setOpen(false); };
  return <>
    <div className={`sidebar-scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand-row"><button className="brand" onClick={() => navigate("marketplace")}><span className="brand-symbol">✦</span><strong>Agent Market</strong></button><button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close menu">×</button></div>
      <button className="new-agent" onClick={onNew}><Glyph>＋</Glyph><span>New agent</span><kbd>⌘ K</kbd></button>
      <nav className="primary-nav" aria-label="Primary navigation">
        <NavButton active={view === "marketplace"} onClick={() => navigate("marketplace")} mark="⌂" label="Discover" />
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
  const titles: Record<View, string> = { marketplace: "Discover", builder: blueprint?.name || "Agent Builder", library: "My agents", activity: "Activity", settings: "Settings" };
  return <header className="topbar"><div className="topbar-title"><button className="menu-button" onClick={onMenu} aria-label="Open menu">☰</button><span className="mobile-brand">✦</span><strong>{titles[view]}</strong>{view === "builder" && <span className="draft-pill">Draft</span>}</div><div className="topbar-actions">{view === "builder" && <><label className="model-picker top-model"><span className="status-dot" /> <select aria-label="Model" value={model} onChange={(event) => setModel(event.target.value)}><option>Auto</option><option>Fast</option><option>Powerful</option></select></label><button className="icon-button" aria-label="Share">↗</button><button className="publish-button" onClick={onPublish} disabled={!blueprint || busy}>{blueprint?.status === "published" ? "Published" : "Publish"}</button></>} {view !== "builder" && <><button className="icon-button search-top" aria-label="Search">⌕</button><button className="avatar-button">AM</button></>}</div></header>;
}

function Marketplace({ query, setQuery, category, setCategory, filtered, onCreate, prompt, setPrompt, onInstall }: { query: string; setQuery: (value: string) => void; category: string; setCategory: (value: string) => void; filtered: MarketAgent[]; onCreate: (value: string) => void; prompt: string; setPrompt: (value: string) => void; onInstall: (agent: MarketAgent) => void }) {
  const featured = catalog.find((agent) => agent.featured)!;
  return <div className="marketplace-view">
    <section className="market-hero">
      <div className="hero-glow glow-one" /><div className="hero-glow glow-two" />
      <div className="hero-copy"><span className="eyebrow"><i /> THE AGENT MARKETPLACE</span><h1>Find an agent.<br/><span>Or describe your own.</span></h1><p>Discover trusted AI agents for any job, or turn a plain-language idea into a production-ready agent in minutes.</p></div>
      <form className="hero-composer" onSubmit={(event) => { event.preventDefault(); onCreate(prompt); }}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the agent you want to create…" aria-label="Describe the agent you want to create" rows={2} /><div className="hero-composer-foot"><div><button type="button" className="composer-tool" aria-label="Attach files">＋</button><button type="button" className="context-pill"><span>⌘</span> Add knowledge</button></div><button className="hero-send" aria-label="Create agent" disabled={!prompt.trim()}>↑</button></div></form>
      <div className="prompt-suggestions"><span>Try</span>{quickPrompts.map((item) => <button key={item} onClick={() => onCreate(item)}>{item}<i>↗</i></button>)}</div>
    </section>
    <section className="market-content">
      <div className="market-toolbar"><div><h2>Explore agents</h2><p>Ready-to-use specialists built by trusted creators.</p></div><label className="market-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents" aria-label="Search agents" /></label></div>
      <div className="category-row" aria-label="Agent categories">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      {category === "All" && !query && <button className="featured-card" onClick={() => onInstall(featured)}><div className="featured-copy"><span className="featured-label">FEATURED AGENT</span><div className={`agent-icon xl ${featured.accent}`}>{featured.icon}<i>✦</i></div><h3>{featured.name}</h3><p>{featured.description}</p><div className="creator-line"><span className="creator-avatar">N</span><span>By {featured.creator}</span><b>✓</b></div><div className="featured-actions"><span>View agent <i>↗</i></span><small>★ {featured.rating} · {formatInstalls(featured.installs)} installs</small></div></div><div className="featured-visual"><div className="brief-window"><div className="window-top"><span/><span/><span/><em>Research brief</em></div><div className="brief-body"><span className="brief-kicker">MARKET LANDSCAPE</span><strong>AI customer support<br/>platforms in 2026</strong><div className="brief-chart"><i/><i/><i/><i/><i/></div><div className="brief-sources"><span>8 sources</span><span>24 insights</span><span>3 recommendations</span></div></div></div><div className="citation-float">✓ Sources verified</div></div></button>}
      <div className="agents-grid">{filtered.filter((agent) => !(category === "All" && !query && agent.featured)).map((agent) => <AgentCard key={agent.id} agent={agent} onClick={() => onInstall(agent)} />)}</div>
      {!filtered.length && <div className="no-results"><span>⌕</span><h3>No agents found</h3><p>Try another search or create exactly what you need.</p><button onClick={() => onCreate(`Create an agent for ${query || category}`)}>Create this agent</button></div>}
      <div className="creator-banner"><div><span className="eyebrow"><i /> BUILT FOR YOUR WORK</span><h2>Can’t find the right fit?</h2><p>Describe what you need. The Agent Architect will design the prompt, tools, workflow, and safety rules with you.</p><button onClick={() => onCreate("Help me design a custom agent for my business")}>Create a custom agent <span>→</span></button></div><div className="mini-flow"><div className="flow-bubble user">“Handle support in English and Spanish”</div><div className="flow-line"/><div className="flow-orb">✦</div><div className="flow-line"/><div className="flow-bubble result"><i>✓</i><span><strong>Luma Support</strong><small>8 capabilities configured</small></span></div></div></div>
    </section>
  </div>;
}

function AgentCard({ agent, onClick }: { agent: MarketAgent; onClick: () => void }) {
  return <button className="agent-card" onClick={onClick}><div className="card-top"><div className={`agent-icon ${agent.accent}`}>{agent.icon}</div><span className="category-tag">{agent.category}</span></div><h3>{agent.name}{agent.verified && <i className="verified">✓</i>}</h3><strong>{agent.tagline}</strong><p>{agent.description}</p><div className="tag-list">{agent.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div><div className="card-footer"><span><i className="creator-avatar sm">{agent.creator[0]}</i>{agent.creator}</span><span>★ {agent.rating} · {formatInstalls(agent.installs)}</span></div></button>;
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
  const [tab, setTab] = useState<"overview" | "prompt" | "test">("overview");
  const [testText, setTestText] = useState(blueprint.starters[0] || "Hello");
  const [testResult, setTestResult] = useState("");
  return <aside className="blueprint-panel"><div className="blueprint-head"><div><span>AGENT BLUEPRINT</span><h2>{blueprint.name}</h2></div><div className="blueprint-actions"><button aria-label="More actions">•••</button><button aria-label="Close blueprint">×</button></div></div><div className="blueprint-tabs"><button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button><button className={tab === "prompt" ? "active" : ""} onClick={() => setTab("prompt")}>Instructions</button><button className={tab === "test" ? "active" : ""} onClick={() => setTab("test")}>Test</button></div>
    {tab === "overview" && <div className="blueprint-body"><div className="agent-identity"><div className={`agent-icon lg ${blueprint.accent}`}>{blueprint.icon}</div><div><h3>{blueprint.name}</h3><p>{blueprint.tagline}</p><span className="draft-state"><i /> {blueprint.status === "published" ? "Published" : "Draft saved"}</span></div></div><SpecBlock title="Purpose"><p>{blueprint.purpose}</p></SpecBlock><SpecBlock title="Workflow"><div className="workflow-list">{blueprint.steps.map((step, index) => <div key={step.title}><span>{index + 1}</span><p><strong>{step.title}</strong><small>{step.detail}</small></p></div>)}</div></SpecBlock><SpecBlock title="Tools" action="Manage"><div className="capability-list">{blueprint.tools.map((tool) => <span key={tool}><i>{tool[0]}</i>{tool}<b>✓</b></span>)}</div></SpecBlock><SpecBlock title="Channels" action="Connect"><div className="chip-list">{blueprint.channels.map((channel) => <span key={channel}>{channel}</span>)}</div></SpecBlock><SpecBlock title="Guardrails"><ul className="guardrail-list">{blueprint.guardrails.map((rule) => <li key={rule}><span>✓</span>{rule}</li>)}</ul></SpecBlock><SpecBlock title="Conversation starters"><div className="starter-list">{blueprint.starters.map((starter) => <button key={starter}>{starter}<span>↗</span></button>)}</div></SpecBlock></div>}
    {tab === "prompt" && <div className="blueprint-body"><div className="prompt-editor-head"><span>System instructions</span><button>Copy</button></div><pre className="prompt-preview">{blueprint.systemPrompt}</pre><SpecBlock title="Knowledge plan"><div className="knowledge-list">{blueprint.knowledge.map((item) => <div key={item}><span>◫</span><p><strong>{item}</strong><small>Recommended source</small></p><button>＋</button></div>)}</div></SpecBlock></div>}
    {tab === "test" && <div className="blueprint-body test-body"><div className="test-stage"><div className="test-agent"><span className={`mini-avatar ${blueprint.accent}`}>{blueprint.icon}</span><div><strong>{blueprint.name}</strong><small>Preview sandbox</small></div></div>{testResult && <div className="test-response"><span className={`mini-avatar ${blueprint.accent}`}>{blueprint.icon}</span><p>{testResult}</p></div>}<div className="test-compose"><textarea value={testText} onChange={(event) => setTestText(event.target.value)} rows={3}/><button onClick={() => setTestResult(`I’ll handle that as ${blueprint.name}. I’ll first confirm the goal and required context, then use only the approved tools and return a clear next step.`)}>↑</button></div></div><p className="sandbox-note">Sandbox runs do not trigger external actions.</p></div>}
    <div className="blueprint-footer"><button className="secondary-action">Run evaluation</button><button className="primary-action" onClick={onPublish} disabled={busy}>{blueprint.status === "published" ? "Published ✓" : "Publish agent"}</button></div>
  </aside>;
}

function SpecBlock({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return <section className="spec-block"><div className="spec-title"><h4>{title}</h4>{action && <button>{action}</button>}</div>{children}</section>;
}

function Library({ agents, onOpen, onNew }: { agents: Blueprint[]; onOpen: (agent: Blueprint) => void; onNew: () => void }) {
  return <div className="standard-view"><div className="page-heading"><div><span className="eyebrow"><i /> YOUR WORKSPACE</span><h1>My agents</h1><p>Draft, test, and manage every agent you create.</p></div><button className="primary-page-action" onClick={onNew}>＋ Create agent</button></div>{agents.length ? <div className="library-grid">{agents.map((agent) => <button className="library-card" key={agent.id} onClick={() => onOpen(agent)}><div className="library-card-head"><div className={`agent-icon ${agent.accent}`}>{agent.icon}</div><span className={`library-status ${agent.status}`}><i /> {agent.status}</span></div><h3>{agent.name}</h3><p>{agent.tagline}</p><div className="library-tools">{agent.tools.slice(0, 3).map((tool) => <span key={tool}>{tool}</span>)}</div><div className="library-foot"><span>Edited {new Date(agent.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><i>→</i></div></button>)}</div> : <div className="empty-library"><div className="empty-orb">✦</div><h2>Your first agent starts with one sentence.</h2><p>Describe the outcome you want. Agent Architect will configure everything else with you.</p><button onClick={onNew}>Create your first agent</button></div>}</div>;
}

function Activity({ agents }: { agents: Blueprint[] }) {
  const rows = agents.flatMap((agent) => [{ type: "created", agent, label: "Blueprint created", detail: "Purpose, tools, guardrails, and workflow configured" }, ...(agent.status === "published" ? [{ type: "published", agent, label: "Agent published", detail: "Available in your workspace library" }] : [])]);
  return <div className="standard-view narrow"><div className="page-heading"><div><span className="eyebrow"><i /> WORKSPACE LOG</span><h1>Activity</h1><p>A transparent record of builds, tests, and releases.</p></div></div><div className="activity-panel"><div className="activity-filter"><button className="active">All activity</button><button>Builds</button><button>Releases</button><button>Runs</button></div>{rows.length ? rows.map((row, index) => <div className="activity-row" key={`${row.agent.id}-${row.type}`}><div className={`activity-mark ${row.type}`}>{row.type === "published" ? "↑" : "✦"}</div><div><strong>{row.label}</strong><p>{row.agent.name} · {row.detail}</p></div><time>{index ? "Recently" : "Just now"}</time></div>) : <div className="activity-empty"><span>↗</span><h3>No activity yet</h3><p>Your build history will appear here.</p></div>}</div></div>;
}

function Settings({ model, setModel, webEnabled, setWebEnabled, notify }: { model: string; setModel: (value: string) => void; webEnabled: boolean; setWebEnabled: (value: boolean) => void; notify: (text: string) => void }) {
  return <div className="standard-view settings-view"><div className="page-heading"><div><span className="eyebrow"><i /> PERSONAL WORKSPACE</span><h1>Settings</h1><p>Manage defaults, permissions, and connected knowledge.</p></div></div><div className="settings-layout"><nav><button className="active">General</button><button>Models</button><button>Connections</button><button>Knowledge</button><button>Privacy</button><button>Billing</button></nav><div className="settings-card"><section><div><h3>Default model</h3><p>Choose how Agent Architect balances speed and reasoning.</p></div><select value={model} onChange={(event) => setModel(event.target.value)}><option>Auto</option><option>Fast</option><option>Powerful</option></select></section><section><div><h3>Web research</h3><p>Allow new agents to use current public information by default.</p></div><button className={`switch ${webEnabled ? "on" : ""}`} onClick={() => setWebEnabled(!webEnabled)} aria-label="Toggle web research"><i /></button></section><section><div><h3>Publishing approval</h3><p>Require a final human review before an agent can act outside the sandbox.</p></div><button className="switch on" aria-label="Publishing approval enabled"><i /></button></section><section className="connection-row"><div><h3>Connected knowledge</h3><p>Documents, websites, and data sources available to your agents.</p></div><button onClick={() => notify("Knowledge connector ready")}>Manage sources <span>→</span></button></section><div className="settings-save"><span>Changes are saved automatically.</span><button onClick={() => notify("Settings saved")}>Save changes</button></div></div></div></div>;
}

function AgentModal({ agent, onClose, onUse }: { agent: MarketAgent; onClose: () => void; onUse: () => void }) {
  return <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={`${agent.name} details`}><button className="modal-backdrop" onClick={onClose} aria-label="Close dialog"/><div className="agent-modal"><div className={`modal-hero ${agent.accent}`}><button className="modal-close" onClick={onClose} aria-label="Close">×</button><div className={`agent-icon hero-icon ${agent.accent}`}>{agent.icon}</div><span>{agent.category}</span><h2>{agent.name}</h2><p>{agent.tagline}</p></div><div className="modal-content"><div className="modal-creator"><span className="creator-avatar">{agent.creator[0]}</span><span><strong>{agent.creator}</strong><small>Verified creator</small></span><b>✓</b></div><p className="modal-description">{agent.description}</p><div className="modal-stats"><div><strong>{agent.rating}</strong><span>★ rating</span></div><div><strong>{formatInstalls(agent.installs)}</strong><span>installs</span></div><div><strong>{agent.tags.length + 3}</strong><span>capabilities</span></div></div><h3>What it can do</h3><div className="modal-capabilities">{agent.tags.map((tag) => <span key={tag}><i>✓</i>{tag}</span>)}<span><i>✓</i>Custom instructions</span><span><i>✓</i>Human handoff</span></div><div className="modal-actions"><button className="modal-secondary" onClick={onClose}>Preview</button><button className="modal-primary" onClick={onUse}>Use this agent <span>→</span></button></div><small className="modal-note">Creates a private, editable copy in your workspace.</small></div></div></div>;
}
