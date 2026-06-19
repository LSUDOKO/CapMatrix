"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Radio, Send, Bot, User, Clock, ExternalLink, Zap,
  Shield, Activity, Copy, Check, ChevronDown, ChevronRight, AlertTriangle,
  Sparkles, Network,
} from "lucide-react";
import { shortAddr, extractExecutionData, agentColor, agentIcon, renderInlineMarkdown } from "@/lib/band/execution";

// ── Design tokens ─────────────────────────────────────────────────────────────
const INK       = "#000";
const INK_1     = "#0B0018";
const INK_2     = "#1A0033";
const ACCENT    = "#A46EDB";
const ACCENT_SOFT = "rgba(164,110,219,0.18)";
const ACCENT_GLOW = "rgba(164,110,219,0.35)";
const TEXT      = "#F0EDF5";
const TEXT2     = "#D4C4EC";
const MID       = "#8A7CB8";
const LINE      = "rgba(180,140,222,0.08)";
const LINE_MID  = "rgba(180,140,222,0.15)";

const SCOUT_CLR    = "#3DCEFF";
const RISK_CLR     = "#FFD93D";
const EXECUTOR_CLR = "#FF8A66";

interface BandMsg {
  id: string;
  content: string;
  senderId: string;
  senderName: string | null;
  senderType: "User" | "Agent";
  insertedAt: string | null;
  metadata: Record<string, unknown> | null;
}

interface Participant {
  id: string;
  name: string | null;
  type: "User" | "Agent";
  role: "owner" | "admin" | "member";
}

interface RoomDetail {
  room: { id: string; name: string | null; messageCount: number; agentCount: number; userCount: number };
  messages: BandMsg[];
  participants: Participant[];
  workflowId?: string | null;
  stats: { totalMessages: number; agentMessages: number; userMessages: number; executionMessages: number };
}

// shortAddr imported from @/lib/band/execution

function ago(ts: string | number | Date | null): string {
  if (!ts) return "";
  const ms = Date.now() - new Date(ts).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function formatTime(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDate(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return formatTime(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + formatTime(ts);
}

// extractAddresses imported from @/lib/band/execution

// extractTxHashes imported from @/lib/band/execution

// extractExecutionData imported from @/lib/band/execution

// renderInlineMarkdown imported from @/lib/band/execution

// agentColor imported from @/lib/band/execution

// agentIcon imported from @/lib/band/execution

// ── Execution result card ──
function ExecutionCard({ data }: { data: ReturnType<typeof extractExecutionData> }) {
  if (!data.txHash && !data.protocol && !data.amount) return null;
  return (
    <div style={{
      marginTop: 8, padding: "10px 12px", borderRadius: 8,
      background: `${data.success === null ? ACCENT : data.success ? "#22c55e" : EXECUTOR_CLR}0A`,
      border: `1px solid ${data.success === null ? ACCENT + "22" : data.success ? "#22c55e33" : EXECUTOR_CLR + "33"}`,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9.5, color: data.success === false ? EXECUTOR_CLR : "#22c55e", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        <Zap size={11} />
        {data.success === true ? "Execution confirmed" : data.success === false ? "Execution failed" : "Execution detected"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 10px", fontSize: 11, color: TEXT2 }}>
        {data.action && <><span style={{ color: MID }}>Action</span><span style={{ color: TEXT }}>{data.action}</span></>}
        {data.protocol && <><span style={{ color: MID }}>Protocol</span><span style={{ color: TEXT }}>{data.protocol}</span></>}
        {data.amount && <><span style={{ color: MID }}>Amount</span><span style={{ color: TEXT }}>{data.amount}</span></>}
      </div>
      {data.txHash && (
        <a
          href={`https://basescan.org/tx/${data.txHash}`}
          target="_blank" rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 10.5, color: ACCENT, textDecoration: "none",
            padding: "4px 9px", borderRadius: 5,
            background: ACCENT_SOFT, border: `1px solid ${ACCENT}33`,
            fontFamily: "monospace",
          }}
        >
          <ExternalLink size={10} />
          Basescan · {shortAddr(data.txHash)}
        </a>
      )}
      {data.addresses.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
          {data.addresses.map((addr) => (
            <a
              key={addr}
              href={`https://basescan.org/address/${addr}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 10, color: MID, textDecoration: "none",
                fontFamily: "monospace",
              }}
            >
              <ExternalLink size={9} />
              {shortAddr(addr)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── System message (separator / status update) ──
function SystemMessage({ content }: { content: string }) {
  const lower = content.toLowerCase();
  let icon = <Zap size={12} />;
  let color = MID;
  if (lower.includes("complete") || lower.includes("success") || lower.includes("✅")) {
    icon = <Sparkles size={12} style={{ color: "#22c55e" }} />;
    color = "#22c55e";
  } else if (lower.includes("fail") || lower.includes("error") || lower.includes("❌")) {
    icon = <AlertTriangle size={12} style={{ color: EXECUTOR_CLR }} />;
    color = EXECUTOR_CLR;
  } else if (lower.includes("scout") || lower.includes("🔭")) {
    icon = <Activity size={12} style={{ color: SCOUT_CLR }} />;
    color = SCOUT_CLR;
  } else if (lower.includes("risk") || lower.includes("🛡️")) {
    icon = <Shield size={12} style={{ color: RISK_CLR }} />;
    color = RISK_CLR;
  } else if (lower.includes("execut") || lower.includes("⚡") || lower.includes("tx") || lower.includes("0x")) {
    icon = <Zap size={12} style={{ color: EXECUTOR_CLR }} />;
    color = EXECUTOR_CLR;
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7, justifyContent: "center",
      padding: "8px 0", fontSize: 11, color, fontWeight: 500,
    }}>
      {icon}
      <span>{content}</span>
    </div>
  );
}

// ── Agent message bubble ──
function AgentMessage({ msg }: { msg: BandMsg }) {
  const color = agentColor(msg.senderName);
  const execData = extractExecutionData(msg.content);
  const hasExecution = !!execData.txHash || !!execData.protocol || !!execData.amount;

  // System messages (short, divider-style)
  if (msg.content.startsWith("━━") || msg.content.startsWith("✅") || msg.content.startsWith("❌")) {
    return <SystemMessage content={msg.content} />;
  }

  return (
    <div style={{ display: "flex", gap: 10, maxWidth: "85%", alignSelf: "flex-start" }}>
      {/* Agent avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `${color}15`, border: `1px solid ${color}33`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15,
      }}>
        {agentIcon(msg.senderName)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {/* Sender name + timestamp */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color, fontWeight: 600, letterSpacing: "-0.005em" }}>
            {msg.senderName ?? "Agent"}
          </span>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, opacity: 0.6 }} />
          <span style={{ fontSize: 10, color: MID, opacity: 0.7 }}>
            {formatDate(msg.insertedAt)}
          </span>
        </div>

        {/* Message content */}
        <div style={{
          padding: "10px 14px", borderRadius: "0 12px 12px 12px",
          background: `${color}06`, border: `1px solid ${color}18`,
          fontSize: 13, color: TEXT2, lineHeight: 1.6, whiteSpace: "pre-wrap",
          fontFamily: "var(--sans)", letterSpacing: "-0.005em",
        }}>
          {renderInlineMarkdown(msg.content, React, TEXT)}
        </div>

        {/* Execution card */}
        {hasExecution && <ExecutionCard data={execData} />}
      </div>
    </div>
  );
}

// ── User message bubble ──
function UserMessage({ msg }: { msg: BandMsg }) {
  return (
    <div style={{ display: "flex", gap: 10, maxWidth: "75%", alignSelf: "flex-end", flexDirection: "row-reverse" }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `${ACCENT}15`, border: `1px solid ${ACCENT}33`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15,
      }}>
        <User size={15} style={{ color: ACCENT }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: MID, opacity: 0.7 }}>
            {formatDate(msg.insertedAt)}
          </span>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, opacity: 0.6 }} />
          <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600, letterSpacing: "-0.005em" }}>
            {msg.senderName ?? "You"}
          </span>
        </div>

        <div style={{
          padding: "10px 14px", borderRadius: "12px 0 12px 12px",
          background: `${ACCENT}0C`, border: `1px solid ${ACCENT}22`,
          fontSize: 13, color: TEXT, lineHeight: 1.6, whiteSpace: "pre-wrap",
          fontFamily: "var(--sans)", letterSpacing: "-0.005em",
        }}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}

// ── Room stats bar ──
function StatsBar({ stats }: { stats: RoomDetail["stats"] }) {
  return (
    <div style={{
      display: "flex", gap: 16, padding: "10px 16px",
      background: INK_1, border: `1px solid ${LINE}`, borderRadius: 8,
      fontSize: 11, color: MID,
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <Radio size={12} style={{ color: "#22c55e" }} />
        <span>{stats.totalMessages} messages</span>
      </span>
      <span style={{ opacity: 0.3 }}>|</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <Bot size={12} style={{ color: SCOUT_CLR }} />
        <span>{stats.agentMessages} agent</span>
      </span>
      <span style={{ opacity: 0.3 }}>|</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <Zap size={12} style={{ color: EXECUTOR_CLR }} />
        <span>{stats.executionMessages} executions</span>
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BandRoomDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const roomId = params.id;

  const [detail, setDetail] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMsgCount = useRef(0);

  const loadDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/band/room-detail?roomId=${encodeURIComponent(roomId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = (await res.json()) as RoomDetail;
      setDetail(d);
      setError(null);
      prevMsgCount.current = d.messages.length;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Poll: reload full detail every 5s to catch new messages + participant changes
  useEffect(() => {
    void loadDetail();
    const poll = async () => {
      try {
        const res = await fetch(`/api/band/room-detail?roomId=${encodeURIComponent(roomId)}`);
        if (!res.ok) return;
        const d = (await res.json()) as RoomDetail;
        if (d.messages.length !== prevMsgCount.current) {
          prevMsgCount.current = d.messages.length;
          setDetail(d);
        }
      } catch { /* ignore */ }
    };
    pollRef.current = setInterval(poll, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadDetail, roomId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && detail) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [detail?.messages.length]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch("/api/band/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, content: text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Refresh messages
      await loadDetail();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : String(e));
      setTimeout(() => setSendError(null), 4000);
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div style={{
        background: INK, color: TEXT, height: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--sans)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Radio size={28} style={{ color: "#22c55e", opacity: 0.5 }} />
          <div style={{ fontSize: 14, color: TEXT2 }}>Loading room…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: INK, color: TEXT, height: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--sans)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <AlertTriangle size={24} style={{ color: EXECUTOR_CLR }} />
          <div style={{ fontSize: 14, color: EXECUTOR_CLR }}>Failed to load room</div>
          <div style={{ fontSize: 12, color: MID }}>{error}</div>
          <button onClick={() => { setLoading(true); void loadDetail(); }}
            style={{
              padding: "8px 16px", borderRadius: 7,
              background: ACCENT, color: INK, border: "none", fontSize: 12.5, cursor: "pointer",
            }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const messages = detail?.messages ?? [];
  const participants = detail?.participants ?? [];
  const agents = participants.filter(p => p.type === "Agent");
  const roomName = detail?.room?.name ?? `Room ${roomId.slice(0, 8)}`;

  return (
    <div style={{
      background: INK, color: TEXT, height: "100vh", width: "100vw",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--sans)", overflow: "hidden",
    }}>
      {/* ── Top bar ── */}
      <header style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "0 20px", height: 56,
        borderBottom: `1px solid ${LINE}`,
        flexShrink: 0,
      }}>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "transparent", border: "none",
            color: TEXT2, cursor: "pointer", fontSize: 13, padding: "6px 8px",
          }}
        >
          <ArrowLeft size={14} /> Dashboard
        </button>
        <span style={{ color: MID, fontSize: 12 }}>/</span>

        {/* Room icon + name */}
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Radio size={14} style={{ color: "#22c55e" }} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: TEXT, letterSpacing: "-0.01em" }}>
          {roomName}
        </span>
        {detail?.workflowId && (
          <button
            onClick={() => router.push(`/dashboard/workflow/${detail.workflowId}`)}
            title="Open workflow"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: 6,
              background: "rgba(164,110,219,0.08)", border: "1px solid rgba(164,110,219,0.2)",
              color: ACCENT, fontSize: 10.5, cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            Workflow ↗
          </button>
        )}
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 10.5, color: "#22c55e",
          background: "rgba(34,197,94,0.08)", padding: "3px 9px", borderRadius: 20,
          fontWeight: 500,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
          Live
        </span>

        <div style={{ flex: 1 }} />

        {/* Agent badges */}
        <div style={{ display: "flex", gap: 4 }}>
          {agents.map(p => {
            const col = agentColor(p.name);
            return (
              <div key={p.id} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 6,
                background: `${col}0A`, border: `1px solid ${col}22`,
                fontSize: 11, color: col,
              }}>
                <span>{agentIcon(p.name)}</span>
                <span style={{ fontWeight: 500 }}>{p.name ?? "Agent"}</span>
              </div>
            );
          })}
        </div>

        <div style={{ width: 1, height: 24, background: LINE }} />

        {/* Room ID */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 10.5, color: MID, fontFamily: "monospace",
        }}>
          {shortAddr(roomId)}
          <button
            onClick={() => copyToClipboard(roomId, "room-id")}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: MID, padding: 2 }}
          >
            {copiedId === "room-id" ? <Check size={12} style={{ color: "#22c55e" }} /> : <Copy size={12} />}
          </button>
        </div>
      </header>

      {/* ── Stats bar ── */}
      {detail && (
        <div style={{ padding: "8px 20px", borderBottom: `1px solid ${LINE}` }}>
          <StatsBar stats={detail.stats} />
        </div>
      )}

      {/* ── Messages area ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: "auto", padding: "20px 24px",
          display: "flex", flexDirection: "column", gap: 6,
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 12, flex: 1, color: MID,
          }}>
            <Network size={32} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: TEXT2 }}>No messages yet</div>
            <div style={{ fontSize: 12, lineHeight: 1.5, textAlign: "center", maxWidth: 360 }}>
              Send a message below to start the workflow. Agents will respond in real-time.
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isUser = msg.senderType === "User";

            // Check if this is a system/separator message (starts with ━━)
            if (msg.content.startsWith("━━")) {
              return (
                <div key={msg.id || i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "4px 0", opacity: 0.4,
                }}>
                  <div style={{ flex: 1, height: 1, background: LINE_MID }} />
                  <span style={{ fontSize: 9, color: MID, whiteSpace: "nowrap", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {formatDate(msg.insertedAt)}
                  </span>
                  <div style={{ flex: 1, height: 1, background: LINE_MID }} />
                </div>
              );
            }

            // System-like short messages
            const lower = msg.content.toLowerCase();
            if (
              msg.content.startsWith("✅") || msg.content.startsWith("❌") ||
              msg.content.startsWith("🧠") || msg.content.startsWith("📋") ||
              msg.content.startsWith("💰") || msg.content.startsWith("⛓️") ||
              msg.content.startsWith("🔭") || msg.content.startsWith("🛡️") ||
              msg.content.startsWith("⚡") ||
              msg.content === "Room is live. Agents will respond when their role is called." ||
              msg.content.startsWith("Use @mentions to trigger")
            ) {
              return (
                <div key={msg.id || i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "4px 0", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 13, color: TEXT2, textAlign: "center", fontWeight: msg.content.startsWith("🧠") ? 600 : 400 }}>
                    {renderInlineMarkdown(msg.content, React, TEXT)}
                  </span>
                </div>
              );
            }

            return isUser
              ? <UserMessage key={msg.id || i} msg={msg} />
              : <AgentMessage key={msg.id || i} msg={msg} />;
          })
        )}

        {/* Typing indicator when sending */}
        {sending && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", alignSelf: "flex-end" }}>
            <div style={{
              padding: "8px 14px", borderRadius: 12, background: `${ACCENT}0C`,
              border: `1px solid ${ACCENT}22`, color: MID, fontSize: 13,
            }}>
              <span className="clove-typing" aria-hidden>
                <span className="d">·</span><span className="d">·</span><span className="d">·</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Send error toast ── */}
      {sendError && (
        <div style={{
          padding: "8px 14px", margin: "0 20px", borderRadius: 8,
          background: "rgba(255,69,69,0.1)", border: "1px solid rgba(255,69,69,0.25)",
          color: "#FF8A66", fontSize: 12, textAlign: "center",
        }}>
          Failed to send: {sendError}
        </div>
      )}

      {/* ── Prompt bar ── */}
      <div style={{
        padding: "12px 20px 16px", borderTop: `1px solid ${LINE}`,
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 10, maxWidth: 800, margin: "0 auto",
          background: INK_1, border: `1px solid ${LINE_MID}`, borderRadius: 14,
          padding: "8px 8px 8px 16px",
          transition: "border-color .2s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = LINE_MID; }}
        >
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            rows={1}
            placeholder="Message the agent team… @mention an agent for a specific task"
            style={{
              flex: 1, resize: "none", background: "transparent", border: "none", outline: "none",
              color: TEXT, fontSize: 14, lineHeight: 1.5, fontFamily: "inherit",
              maxHeight: 120, padding: "7px 0",
            }}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={!input.trim() || sending}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 10, border: "none",
              background: input.trim() && !sending ? ACCENT : LINE_MID,
              color: input.trim() && !sending ? TEXT : MID,
              cursor: input.trim() && !sending ? "pointer" : "not-allowed",
              transition: "all .2s",
            }}
          >
            <Send size={15} />
          </button>
        </div>
        <div style={{
          textAlign: "center", fontSize: 10, color: MID, marginTop: 6, opacity: 0.6,
        }}>
          Agents collaborate in real-time · Use @Scout, @RiskMonitor, @Executor to trigger specific agents
        </div>
      </div>

      {/* Styles for typing animation */}
      <style>{`
        .clove-typing .d {
          animation: clv-blink 1.2s infinite;
          display: inline-block;
        }
        .clove-typing .d:nth-child(2) { animation-delay: 0.2s; }
        .clove-typing .d:nth-child(3) { animation-delay: 0.4s; }
        @keyframes clv-blink {
          0%, 80%, 100% { opacity: 0.2; }
          40%            { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
