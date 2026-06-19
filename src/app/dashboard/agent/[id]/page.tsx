"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";

/** Fits all thought nodes into view after async hydration from DB */
function FitViewOnLoad({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (nodeCount > 0) setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 80);
  }, [nodeCount, fitView]);
  return null;
}
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft, Play, RefreshCw, LayoutDashboard, Workflow as WorkflowIcon,
  BarChart2, BookUser, Clock, X, Sparkles, MessageCircle,
} from "lucide-react";
import AgentThoughtNode from "@/components/AgentThoughtNode";
import AgentIdentityCard from "@/components/AgentIdentityCard";
import { metamaskStore } from "@/lib/web3/metamaskStore";

// ── Design tokens (matching the dashboard's dark purple theme) ──
const INK    = "#000";
const INK_1  = "#0B0018";
const INK_2  = "#1A0033";
const INK_3  = "#200D42";
const ACCENT = "#A46EDB";
const ACCENT_TX = "#A46EDB";
const ACCENT_SOFT = "rgba(164,110,219,0.18)";
const ACCENT_GLOW = "rgba(164,110,219,0.35)";
const TEXT   = "#F0EDF5";
const TEXT2  = "#D4C4EC";
const MID    = "#8A7CB8";
const MID_2  = "#9A8CC6";
const LINE   = "rgba(180,140,222,0.08)";
const LINE_MID = "rgba(180,140,222,0.15)";

interface Agent {
  id:           string;
  name:         string;
  goal:         string;
  budgetUsdc:   string;
  budgetUsedUsdc?: string;
  mediaPolicy:  "off" | "milestones" | "daily" | "every-run";
  status:       string;
  totalRuns?:   number;
  lastAction?:  string | null;
  lastRunAt?:   string | null;
  delegationStatus?: "active" | "revoked" | "pending" | "none";
}

interface Thought {
  id:        string;
  agentId:   string;
  runId:     string;
  type:      "goal" | "plan" | "tool-call" | "tool-result" | "reflect" | "media";
  content:   Record<string, unknown>;
  parentId:  string | null;
  position:  { x: number; y: number };
}

const NODE_TYPES: NodeTypes = { "agent-thought": AgentThoughtNode };

// ── Sidebar nav item ──
function NavItem({
  icon: Icon, label, active, count, onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px", borderRadius: 8, width: "100%",
        background: active ? "rgba(164,110,219,0.08)" : "transparent",
        border: "none", color: active ? ACCENT_TX : MID, fontSize: 13,
        cursor: onClick ? "pointer" : "default",
        fontWeight: active ? 500 : 400,
        transition: "all .15s",
      }}
      onMouseEnter={(e) => { if (!active && onClick) e.currentTarget.style.background = "rgba(164,110,219,0.04)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Icon size={16} />
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
      {count !== undefined && (
        <span style={{ fontSize: 11, color: MID_2, background: INK_2, padding: "1px 6px", borderRadius: 99 }}>{count}</span>
      )}
    </button>
  );
}

// ── Brand logo ──
function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img
        src="/images/logo.png"
        alt="CapMatrix"
        style={{ width: 22, height: 22, borderRadius: 5, objectFit: "contain" }}
      />
      <span style={{ fontSize: 14, fontWeight: 600, color: TEXT, letterSpacing: "-0.01em" }}>
        CapMatrix
      </span>
    </div>
  );
}

// ── Telegram Link Modal ──
function TelegramLinkModal({
  onClose, wallet,
}: {
  onClose: () => void;
  wallet: string;
}) {
  const [busy, setBusy] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [botName, setBotName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/telegram/link-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: wallet }),
        });
        const data = await res.json() as {
          deepLink?: string | null;
          token?: string;
          botConfigured?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Failed to generate link");
          return;
        }
        setDeepLink(data.deepLink ?? null);
        setToken(data.token ?? null);
        // Extract bot name from deepLink: https://t.me/MyBot?start=token
        if (data.deepLink) {
          const match = data.deepLink.match(/t\.me\/([^?]+)/);
          if (match) setBotName(match[1]);
        }
        if (!data.botConfigured) {
          setError("Telegram bot is not configured on the server. Set TELEGRAM_BOT_TOKEN in your environment.");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [wallet]);

  const copyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(`/start ${token}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const openDeepLink = () => {
    if (deepLink) window.open(deepLink, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: INK_1, border: `1px solid ${LINE_MID}`, borderRadius: 18,
          width: 520, maxWidth: "100%", maxHeight: "88vh",
          color: TEXT, fontFamily: "var(--sans)",
          boxShadow: "0 20px 80px -20px rgba(0,0,0,0.8)",
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "26px 28px 18px", borderBottom: `1px solid ${LINE}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                display: "inline-flex", width: 36, height: 36, alignItems: "center",
                justifyContent: "center", borderRadius: 10,
                background: "rgba(0,136,204,0.12)", border: "1px solid rgba(0,136,204,0.25)",
              }}>
                <MessageCircle size={18} color="#0088CC" />
              </span>
              <div>
                <div style={{ fontSize: 10.5, color: MID, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 2 }}>
                  Connect Telegram
                </div>
                <div style={{ fontSize: 20, fontWeight: 500, fontFamily: "var(--serif)", fontStyle: "italic", letterSpacing: "-0.015em" }}>
                  Link your bot
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: MID }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", flex: 1, overflowY: "auto" }}>
          {busy && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: TEXT2, fontSize: 14 }}>
              <RefreshCw size={16} className="animate-spin" />
              Generating Telegram link…
            </div>
          )}

          {error && !busy && (
            <div style={{
              padding: "14px 16px", borderRadius: 10,
              background: "rgba(255,69,69,0.08)", border: "1px solid rgba(255,69,69,0.3)",
              fontSize: 13, color: "#FF8A66", lineHeight: 1.5,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Connection issue</div>
              {error}
            </div>
          )}

          {!busy && !error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {/* Step 1 */}
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{
                  display: "inline-flex", width: 26, height: 26, alignItems: "center",
                  justifyContent: "center", borderRadius: "50%",
                  background: ACCENT, color: INK, fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>1</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
                    Open Telegram
                  </div>
                  <div style={{ fontSize: 12.5, color: TEXT2, lineHeight: 1.5 }}>
                    Go to your Telegram app on your phone or desktop.
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{
                  display: "inline-flex", width: 26, height: 26, alignItems: "center",
                  justifyContent: "center", borderRadius: "50%",
                  background: ACCENT, color: INK, fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>2</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
                    Find the bot
                  </div>
                  <div style={{ fontSize: 12.5, color: TEXT2, lineHeight: 1.5, marginBottom: 8 }}>
                    Search for{" "}
                    <strong style={{ color: ACCENT_TX }}>
                      @{botName ?? "your_bot"}
                    </strong>{" "}
                    in Telegram and start a chat with it.
                  </div>
                  {deepLink && (
                    <button
                      onClick={openDeepLink}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 7,
                        padding: "8px 16px", borderRadius: 8,
                        background: ACCENT, color: INK, border: "none",
                        fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      <MessageCircle size={14} /> Open in Telegram
                    </button>
                  )}
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{
                  display: "inline-flex", width: 26, height: 26, alignItems: "center",
                  justifyContent: "center", borderRadius: "50%",
                  background: ACCENT, color: INK, fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>3</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
                    Send the start command
                  </div>
                  <div style={{ fontSize: 12.5, color: TEXT2, lineHeight: 1.5, marginBottom: 10 }}>
                    Send the following message to the bot to link your wallet:
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: INK_3, border: `1px solid ${LINE_MID}`,
                    borderRadius: 8, padding: "10px 14px",
                  }}>
                    <code style={{
                      flex: 1, fontSize: 13, color: ACCENT_TX,
                      fontFamily: "monospace", wordBreak: "break-all",
                    }}>
                      /start {token ?? "…"}
                    </code>
                    <button
                      onClick={token ? copyToken : undefined}
                      style={{
                        padding: "6px 10px", borderRadius: 6,
                        background: copied ? "rgba(164,110,219,0.15)" : "transparent",
                        border: `1px solid ${copied ? ACCENT : LINE_MID}`,
                        color: copied ? ACCENT_TX : MID_2, fontSize: 11,
                        cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Done indicator */}
              <div style={{
                padding: "14px 16px", borderRadius: 10,
                background: "rgba(164,110,219,0.06)", border: `1px solid ${ACCENT_SOFT}`,
                fontSize: 12.5, color: TEXT2, lineHeight: 1.5,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Sparkles size={14} color={ACCENT_TX} />
                  <span style={{ fontWeight: 600, color: TEXT }}>What happens next</span>
                </div>
                Once you send the command, your wallet and Telegram will be securely linked.
                You&apos;ll be able to control your agents and receive reports from the bot.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: `1px solid ${LINE}`, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px", borderRadius: 8,
              background: "transparent", border: `1px solid ${LINE_MID}`,
              color: TEXT2, fontSize: 12.5, cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Telegram Link Chip (Top Bar) ──
function TelegramLinkChip({ wallet, onOpen }: { wallet: string | null; onOpen: () => void }) {
  const [label, setLabel] = useState("Telegram");
  const [linked, setLinked] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    fetch(`/api/telegram/status?wallet=${encodeURIComponent(wallet)}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { linked?: boolean; account?: { username?: string; firstName?: string } } | null) => {
        if (cancelled) return;
        setLinked(!!d?.linked);
        setLabel(d?.linked ? (d.account?.username ? `@${d.account.username}` : d.account?.firstName ?? "Linked") : "Telegram");
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [wallet]);

  return (
    <button
      onClick={onOpen}
      title={linked ? "Telegram linked" : "Connect Telegram"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "6px 10px", borderRadius: 7, border: "none",
        background: linked ? "rgba(164,110,219,0.06)" : "transparent",
        color: linked ? ACCENT_TX : MID_2,
        fontSize: 12, cursor: wallet ? "pointer" : "not-allowed",
        opacity: wallet ? 1 : 0.5, fontWeight: linked ? 500 : 400,
        transition: "all .2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(164,110,219,0.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = linked ? "rgba(164,110,219,0.06)" : "transparent"; }}
    >
      <MessageCircle size={13} />
      <span>{label}</span>
    </button>
  );
}

// ── Connect Chip ──
function ConnectChip({ wallet }: { wallet: string | null }) {
  const [show, setShow] = useState(false);
  if (!wallet) {
    return (
      <button
        onClick={() => metamaskStore.connect()}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "6px 10px", borderRadius: 7, border: "none",
          background: "rgba(164,110,219,0.08)",
          color: ACCENT_TX, fontSize: 12, cursor: "pointer", fontWeight: 600,
          transition: "all .2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(164,110,219,0.15)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(164,110,219,0.08)"; }}
      >
        Connect wallet
      </button>
    );
  }
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setShow(s => !s)}
        title={wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Connect"}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "6px 10px", borderRadius: 7, border: "none",
          background: "transparent", color: MID_2,
          fontSize: 12, cursor: "pointer", fontWeight: 400,
          transition: "all .2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(164,110,219,0.06)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7BC86B" }} />
        {wallet.slice(0, 6)}…{wallet.slice(-4)}
      </button>
      {show && (
        <>
          <div onClick={() => setShow(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
            width: 280, padding: "14px 16px", borderRadius: 10,
            background: INK_1, border: `1px solid ${LINE_MID}`,
            boxShadow: "0 8px 32px -8px rgba(0,0,0,0.6)",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ fontSize: 10, color: MID, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Connected Wallet
            </div>
            <div style={{ fontSize: 12, color: TEXT, fontFamily: "monospace", wordBreak: "break-all" }}>
              {wallet}
            </div>
            <button
              onClick={() => { metamaskStore.disconnect(); setShow(false); }}
              style={{
                padding: "6px 12px", borderRadius: 6, background: "transparent",
                border: `1px solid ${LINE_MID}`, color: TEXT2, fontSize: 11.5,
                cursor: "pointer", marginTop: 4,
              }}
            >
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AgentInnerCanvasPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const agentId = params.id;

  const [agent, setAgent]       = useState<Agent | null>(null);
  const [running, setRunning]   = useState(false);
  const [phase, setPhase]       = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [mmTick, setMmTick]     = useState(0);
  const [telegramOpen, setTelegramOpen] = useState(false);
  // Subscribe to metamask store changes
  useEffect(() => {
    const u = metamaskStore.addListener(() => setMmTick(x => x + 1));
    return () => u();
  }, []);

  const mmState = metamaskStore.getState();
  const wallet: string | null = mmState.userAddress ?? null;

  // Load agent + replay last run's thoughts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/agent/${agentId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { agent: Agent; thoughts: Thought[] };
        if (cancelled) return;
        setAgent(data.agent);
        hydrateCanvas(data.thoughts, setNodes, setEdges);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [agentId, setNodes, setEdges]);

  // Append a new thought to the canvas with the fade-in animation
  const appendThought = useCallback((t: Thought) => {
    setNodes((prev) => {
      if (prev.find((n) => n.id === t.id)) return prev;
      return [
        ...prev,
        {
          id:       t.id,
          type:     "agent-thought",
          position: t.position,
          data:     { type: t.type, content: t.content, fresh: true },
        },
      ];
    });
    if (t.parentId) {
      setEdges((prev) => {
        if (prev.find((e) => e.id === `e_${t.parentId}_${t.id}`)) return prev;
        return [...prev, {
          id:     `e_${t.parentId}_${t.id}`,
          source: t.parentId!,
          target: t.id,
          animated: t.type === "tool-call",
          style: t.type === "tool-call"
            ? { stroke: ACCENT, strokeWidth: 1.25, strokeDasharray: "3 7" }
            : { stroke: "rgba(180,140,222,0.16)", strokeWidth: 1 },
          type: "smoothstep",
        }];
      });
    }
  }, [setNodes, setEdges]);

  const startRun = useCallback(async () => {
    if (running || !agent) return;
    setNodes([{
      id: "run-start",
      type: "agent-thought",
      position: { x: 200, y: 100 },
      data: { type: "goal", content: { text: agent.goal ?? "" }, fresh: true },
    }]);
    setEdges([]);
    setRunning(true);
    setPhase("planning");

    const mm = metamaskStore.getState();
    const body = {
      agentId,
      walletAddress:      mm.userAddress,
      permissionsContext: mm.permission?.permissionsContext,
      delegationManager:  mm.permission?.delegationManager,
      delegationId:       mm.permission?.delegationId,
    };

    try {
      const res = await fetch("/api/agent/run-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.body) throw new Error("No stream body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const block of events) {
          const lines = block.split("\n");
          let evName = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event:")) evName = line.slice(6).trim();
            if (line.startsWith("data:"))  dataStr += line.slice(5).trim();
          }
          if (!dataStr) continue;
          let payload: Record<string, unknown> = {};
          try { payload = JSON.parse(dataStr); } catch { continue; }
          handleSseEvent(evName, payload);
        }
      }
    } catch (e) {
      console.warn("[inner-canvas] stream error:", e);
    } finally {
      setRunning(false);
      setPhase("");
      setRefreshKey(k => k + 1);
    }
  }, [agentId, agent, running, setNodes, setEdges]);

  const handleSseEvent = useCallback((evName: string, payload: Record<string, unknown>) => {
    if (evName === "thought") {
      appendThought(payload as unknown as Thought);
    }
    if (evName === "status") {
      setPhase(String(payload.phase ?? ""));
    }
    if (evName === "done") {
      setPhase("done");
    }
  }, [appendThought]);

  // ── Render ──
  if (!agent) {
    return (
      <div style={{
        background: INK, color: TEXT, height: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--sans)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${LINE_MID}`, borderTopColor: ACCENT, animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 14, color: MID }}>Loading agent…</span>
        </div>
      </div>
    );
  }

  const statusColor =
    agent.status === "executing" || agent.status === "planning" || agent.status === "reflecting" ? ACCENT_TX :
    agent.status === "idle" ? MID : MID_2;

  const isActive = agent.status === "planning" || agent.status === "executing" || agent.status === "reflecting";

  return (
    <div
      style={{
        background: INK,
        color: TEXT,
        height: "100vh",
        width: "100vw",
        display: "grid",
        gridTemplateColumns: "200px 1fr 340px",
        gridTemplateRows: "52px 1fr",
        gridTemplateAreas: `"side top top" "side canvas right"`,
        overflow: "hidden",
        fontFamily: "var(--sans)",
      }}
    >
      {/* ── Sidebar ── */}
      <aside style={{
        gridArea: "side",
        borderRight: `1px solid ${LINE}`,
        padding: "20px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        background: INK_1,
      }}>
        <Brand />

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavItem icon={LayoutDashboard} label="Hub" onClick={() => router.push("/dashboard")} />
          <NavItem icon={WorkflowIcon}    label="Agents" active />
          <NavItem icon={Clock}           label="History" onClick={() => router.push("/dashboard/history")} />
          <NavItem icon={BarChart2}       label="Portfolio" onClick={() => router.push("/dashboard/portfolio")} />
          <NavItem icon={BookUser}        label="Address book" />
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{
          display: "flex", gap: 12, padding: "0 6px", fontSize: 11,
          color: MID, letterSpacing: "0.04em",
        }}>
          <a href="#" style={{ textDecoration: "none", color: MID, transition: "color .2s" }}
             onMouseEnter={(e) => e.currentTarget.style.color = TEXT}
             onMouseLeave={(e) => e.currentTarget.style.color = MID}>Docs</a>
          <a href="#" style={{ textDecoration: "none", color: MID, transition: "color .2s" }}
             onMouseEnter={(e) => e.currentTarget.style.color = TEXT}
             onMouseLeave={(e) => e.currentTarget.style.color = MID}>Discord</a>
          <a href="#" style={{ textDecoration: "none", color: MID, transition: "color .2s" }}
             onMouseEnter={(e) => e.currentTarget.style.color = TEXT}
             onMouseLeave={(e) => e.currentTarget.style.color = MID}>Status</a>
        </div>
      </aside>

      {/* ── Top bar ── */}
      <header style={{
        gridArea: "top",
        display: "flex",
        alignItems: "center",
        borderBottom: `1px solid ${LINE}`,
        padding: "0 16px",
        gap: 12,
        background: INK,
      }}>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "transparent", border: "none", color: TEXT2,
            cursor: "pointer", fontSize: 13, padding: "6px 8px",
            transition: "color .2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = TEXT}
          onMouseLeave={(e) => e.currentTarget.style.color = TEXT2}
        >
          <ArrowLeft size={14} />
        </button>
        <span style={{ color: MID, fontSize: 12 }}>/</span>

        {/* Agent name + status badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: TEXT, letterSpacing: "-0.01em" }}>
            {agent.name}
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 8px", borderRadius: 99,
            background: isActive ? "rgba(164,110,219,0.1)" : "rgba(180,140,222,0.04)",
            border: `1px solid ${isActive ? ACCENT_SOFT : LINE}`,
            fontSize: 10.5, color: statusColor, letterSpacing: "0.04em",
            textTransform: "lowercase",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: isActive ? ACCENT : MID,
              boxShadow: isActive ? `0 0 6px ${ACCENT_GLOW}` : "none",
            }} />
            {agent.status}
          </span>
        </div>

        {/* Goal excerpt */}
        <span style={{
          fontSize: 11.5, color: TEXT2, fontStyle: "italic",
          fontFamily: "var(--serif)", maxWidth: 300,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          &ldquo;{agent.goal.slice(0, 50)}{agent.goal.length > 50 ? "…" : ""}&rdquo;
        </span>

        <div style={{ flex: 1 }} />

        {phase && (
          <span style={{
            fontSize: 11, color: ACCENT, letterSpacing: "0.06em",
            textTransform: "lowercase",
          }}>
            <span style={{
              display: "inline-block", width: 6, height: 6, borderRadius: "50%",
              background: ACCENT, boxShadow: `0 0 8px ${ACCENT_GLOW}`, marginRight: 6,
            }} />
            {phase}
          </span>
        )}

        {/* ── Control bar ── */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: INK_1, borderRadius: 10,
          border: `1px solid ${LINE_MID}`,
          padding: "4px 6px",
        }}>
          {/* Run button */}
          <button
            onClick={startRun}
            disabled={running}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "6px 14px", borderRadius: 7,
              background: running ? "rgba(164,110,219,0.1)" : ACCENT,
              border: "none",
              color: running ? ACCENT_TX : INK,
              fontSize: 12.5, cursor: running ? "not-allowed" : "pointer",
              opacity: running ? 0.6 : 1, fontWeight: 600,
              transition: "all .2s",
            }}
          >
            {running
              ? <><RefreshCw size={12} className="animate-spin" /> Running</>
              : <><Play size={10} fill={INK} stroke="none" /> Run</>}
          </button>

          <div style={{ width: 1, height: 20, background: LINE }} />

          {/* Telegram */}
          <TelegramLinkChip wallet={wallet} onOpen={() => setTelegramOpen(true)} />

          <div style={{ width: 1, height: 20, background: LINE }} />

          {/* Connect */}
          <ConnectChip wallet={wallet} />
        </div>
      </header>

      {/* ── Canvas ── */}
      <section style={{
        gridArea: "canvas",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #000 0%, #0B0018 50%, #000 100%)",
        borderRight: `1px solid ${LINE}`,
      }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          style={{ background: "transparent" }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24} size={1}
            color="rgba(164,110,219,0.08)"
          />
          <FitViewOnLoad nodeCount={nodes.length} />
        </ReactFlow>

        {/* Empty state */}
        {nodes.length === 0 && !running && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              pointerEvents: "none",
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "rgba(164,110,219,0.08)",
              border: `1px solid ${ACCENT_SOFT}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={22} color={MID_2} />
            </div>
            <div style={{ fontSize: 16, color: MID_2, fontFamily: "var(--serif)", fontStyle: "italic" }}>
              The agent is at rest.
            </div>
            <div style={{ fontSize: 13, color: MID, maxWidth: "28ch", textAlign: "center", lineHeight: 1.5 }}>
              Click <span style={{ color: ACCENT_TX, fontWeight: 500 }}>Run</span> in the top bar to watch the agent plan, execute, and reflect in real time.
            </div>
          </div>
        )}
      </section>

      {/* ── Right panel: identity card + knowledge ── */}
      <aside
        style={{
          gridArea: "right",
          padding: "20px 20px 26px",
          overflowY: "auto",
          background: INK_1,
        }}
      >
        <AgentIdentityCard agentId={agentId} agent={agent} refreshKey={refreshKey} />
        <KnowledgePanel agentId={agentId} />
      </aside>

      {/* ── Telegram Link Modal ── */}
      {telegramOpen && wallet && (
        <TelegramLinkModal
          wallet={wallet}
          onClose={() => setTelegramOpen(false)}
        />
      )}
    </div>
  );
}

// ── Hydration ──

function hydrateCanvas(
  thoughts: Thought[],
  setNodes: (n: Node[]) => void,
  setEdges: (e: Edge[]) => void,
) {
  const nodes: Node[] = thoughts.map((t) => ({
    id:       t.id,
    type:     "agent-thought",
    position: t.position,
    data:     { type: t.type, content: t.content, fresh: false },
  }));
  const edges: Edge[] = thoughts
    .filter((t) => t.parentId)
    .map((t) => ({
      id:     `e_${t.parentId}_${t.id}`,
      source: t.parentId!,
      target: t.id,
      type:   "smoothstep",
      style:  { stroke: "rgba(180,140,222,0.12)", strokeWidth: 1 },
    }));
  setNodes(nodes);
  setEdges(edges);
}

// ── Knowledge panel (RAG) ──

function KnowledgePanel({ agentId }: { agentId: string }) {
  const [text, setText]   = useState("");
  const [items, setItems] = useState<{ text: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/agent/${agentId}/knowledge`);
      if (r.ok) setItems(((await r.json()).items ?? []) as { text: string }[]);
    } catch { /* ignore */ }
  }, [agentId]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/agent/${agentId}/knowledge`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      setText("");
      await load();
    } finally { setSaving(false); }
  };

  const clear = async () => {
    await fetch(`/api/agent/${agentId}/knowledge`, { method: "DELETE" });
    await load();
  };

  return (
    <div style={{ marginTop: 20, paddingTop: 18, borderTop: `1px solid ${LINE}` }}>
      <div style={{ fontSize: 10, color: MID, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={11} /> Knowledge · your playbook
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Rules the agent must follow. e.g. "Never touch memecoins. Only blue-chip protocols."`}
        rows={3}
        style={{
          width: "100%", background: INK, border: `1px solid ${LINE}`,
          borderRadius: 8, padding: "10px 12px", color: TEXT, fontSize: 12,
          fontFamily: "var(--sans)", resize: "none", lineHeight: 1.5,
          outline: "none", transition: "border-color .2s",
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = ACCENT_SOFT}
        onBlur={(e) => e.currentTarget.style.borderColor = LINE}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={save}
          disabled={saving || !text.trim()}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 7,
            background: ACCENT, color: INK, border: "none",
            fontWeight: 600, fontSize: 11.5,
            cursor: saving || !text.trim() ? "not-allowed" : "pointer",
            opacity: saving || !text.trim() ? 0.5 : 1,
            transition: "all .2s",
          }}
        >
          {saving ? "Embedding…" : "Add to knowledge"}
        </button>
        {items.length > 0 && (
          <button
            onClick={clear}
            style={{
              padding: "8px 12px", borderRadius: 7,
              background: "transparent", border: `1px solid ${LINE}`,
              color: TEXT2, fontSize: 11.5, cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}
      </div>
      {items.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 9.5, color: MID }}>
            {items.length} chunk{items.length !== 1 ? "s" : ""} stored — injected before every decision
          </div>
          {items.slice(0, 6).map((it, i) => (
            <div key={i} style={{
              fontSize: 11, color: TEXT2, background: INK,
              border: `1px solid ${LINE}`, borderRadius: 6,
              padding: "7px 9px", lineHeight: 1.4,
              transition: "border-color .2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = LINE_MID}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = LINE}
            >
              {it.text.slice(0, 140)}{it.text.length > 140 ? "…" : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
