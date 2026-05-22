// app/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface HistoryItem {
  id: string;
  original: string;
  optimized: string;
  stats: {
    originalTokens: number;
    optimizedTokens: number;
    reduction: number;
  };
  timestamp: Date;
}

export default function Home() {
  const MODELS = [
    {
      provider: "NVIDIA",
      name: "Nemotron 3 Super",
      slug: "nvidia/nemotron-3-super-120b-a12b:free",
    },
    {
      provider: "Poolside",
      name: "Laguna M.1",
      slug: "poolside/laguna-m.1:free",
    },
    {
      provider: "OpenInference",
      name: "GPT-OSS 120B",
      slug: "openai/gpt-oss-120b:free",
    },
    { provider: "Z.ai", name: "GLM 4.5 Air", slug: "z-ai/glm-4.5-air:free" },
    {
      provider: "Crucible",
      name: "DeepSeek V4 Flash",
      slug: "deepseek/deepseek-v4-flash:free",
    },
    {
      provider: "Arcee AI",
      name: "Trinity Large Thinking",
      slug: "arcee-ai/trinity-large-thinking:free",
    },
    {
      provider: "Poolside",
      name: "Laguna XS.2",
      slug: "poolside/laguna-xs.2:free",
    },
    { provider: "Baidu", name: "CoBuddy", slug: "baidu/cobuddy:free" },
  ];

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].slug);

  const active = history.find((h) => h.id === activeId) ?? null;

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }, [prompt]);

  async function handleOptimize() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: selectedModel }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      const item: HistoryItem = {
        id: crypto.randomUUID(),
        original: prompt.trim(),
        optimized: data.optimized,
        stats: data.stats,
        timestamp: new Date(),
      };

      setHistory((prev) => [item, ...prev]);
      setActiveId(item.id);
      setPrompt("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleOptimize();
  }

  function handleCopy() {
    if (!active) return;
    navigator.clipboard.writeText(active.optimized);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function truncate(str: string, n: number) {
    return str.length > n ? str.slice(0, n) + "..." : str;
  }

  return (
    <div style={styles.root}>
      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={styles.logo}>⚡ PromptEng</span>
        </div>

        <div
          style={styles.newBtn}
          onClick={() => {
            setActiveId(null);
            setPrompt("");
            setError("");
          }}
        >
          <span style={{ fontSize: 16 }}>＋</span> New prompt
        </div>

        <div style={styles.historyLabel}>History</div>

        <div style={styles.historyList}>
          {history.length === 0 && (
            <p style={styles.emptyHistory}>No history yet</p>
          )}
          {history.map((item) => (
            <div
              key={item.id}
              style={{
                ...styles.historyItem,
                ...(activeId === item.id ? styles.historyItemActive : {}),
              }}
              onClick={() => setActiveId(item.id)}
            >
              <p style={styles.historyItemText}>
                {truncate(item.original, 52)}
              </p>
              <span style={styles.historyItemTime}>
                {formatTime(item.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={styles.main}>
        {/* Result area */}
        <div style={styles.resultArea}>
          {!active && !loading && (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateTitle}>Paste any prompt below</p>
              <p style={styles.emptyStateSubtitle}>
                Your optimized, well-engineered prompt will appear here
              </p>
            </div>
          )}

          {loading && (
            <div style={styles.emptyState}>
              <div style={styles.spinner} />
              <p style={styles.emptyStateSubtitle}>
                Engineering your prompt...
              </p>
            </div>
          )}

          {active && !loading && (
            <div style={styles.resultCard}>
              {/* Original */}
              <div style={styles.resultSection}>
                <span style={styles.tag}>Original</span>
                <p style={styles.originalText}>{active.original}</p>
              </div>

              <div style={styles.divider} />

              {/* Optimized */}
              <div style={styles.resultSection}>
                <div style={styles.resultSectionHeader}>
                  <span style={{ ...styles.tag, ...styles.tagGreen }}>
                    Optimized
                  </span>
                  <button style={styles.copyBtn} onClick={handleCopy}>
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <p style={styles.optimizedText}>{active.optimized}</p>
              </div>

              <div style={styles.divider} />

              {/* Stats */}
              <div style={styles.statsRow}>
                <div style={styles.statBox}>
                  <span style={styles.statLabel}>Original tokens</span>
                  <span style={styles.statValue}>
                    {active.stats.originalTokens}
                  </span>
                </div>
                <div style={styles.statBox}>
                  <span style={styles.statLabel}>Optimized tokens</span>
                  <span style={styles.statValue}>
                    {active.stats.optimizedTokens}
                  </span>
                </div>
                <div style={styles.statBox}>
                  <span style={styles.statLabel}>Change</span>
                  <span
                    style={{
                      ...styles.statValue,
                      color:
                        active.stats.reduction > 0
                          ? "#16a34a"
                          : active.stats.reduction < 0
                            ? "#dc2626"
                            : "#6b7280",
                    }}
                  >
                    {active.stats.reduction > 0
                      ? `↓ ${active.stats.reduction}%`
                      : active.stats.reduction < 0
                        ? `↑ ${Math.abs(active.stats.reduction)}%`
                        : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={styles.inputArea}>
          {error && <p style={styles.errorText}>{error}</p>}
          <div style={styles.inputBox}>
            <textarea
              ref={textareaRef}
              style={styles.textarea}
              placeholder="Paste your rough prompt here..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              disabled={loading}
            />
            <div style={styles.inputFooter}>
              <div style={styles.modelSelector}>
                <span style={styles.modelIcon}>⚙</span>
                <select
                  style={styles.modelSelect}
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={loading}
                >
                  {MODELS.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.provider} — {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={styles.hint}>⌘ + Enter</span>
                <button
                  style={{
                    ...styles.submitBtn,
                    opacity: !prompt.trim() || loading ? 0.45 : 1,
                    cursor:
                      !prompt.trim() || loading ? "not-allowed" : "pointer",
                  }}
                  onClick={handleOptimize}
                  disabled={!prompt.trim() || loading}
                >
                  {loading ? "Optimizing..." : "Optimize →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Replace the styles object in your page.tsx with this:

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    height: "100vh",
    background: "#0a0a0a",
    fontFamily: "'Inter', sans-serif",
    color: "#ececec",
  },

  // Sidebar
  sidebar: {
    width: 260,
    minWidth: 260,
    background: "#111111",
    borderRight: "1px solid #222222",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  sidebarHeader: {
    padding: "20px 16px 12px",
    borderBottom: "1px solid #222222",
  },
  logo: {
    fontWeight: 600,
    fontSize: 15,
    letterSpacing: "-0.2px",
    color: "#ececec",
  },
  newBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "10px 10px 4px",
    padding: "9px 12px",
    borderRadius: 8,
    fontSize: 13.5,
    fontWeight: 500,
    color: "#ccc",
    cursor: "pointer",
    background: "transparent",
  },
  historyLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#444",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "12px 16px 6px",
  },
  historyList: {
    flex: 1,
    overflowY: "auto",
    padding: "0 8px 16px",
  },
  emptyHistory: {
    fontSize: 13,
    color: "#444",
    padding: "12px 8px",
  },
  historyItem: {
    padding: "9px 10px",
    borderRadius: 8,
    cursor: "pointer",
    marginBottom: 2,
  },
  historyItemActive: {
    background: "#1e1e1e",
  },
  historyItemText: {
    fontSize: 13,
    color: "#ccc",
    lineHeight: 1.45,
    marginBottom: 2,
    wordBreak: "break-word",
  },
  historyItemTime: {
    fontSize: 11,
    color: "#555",
  },

  // Main
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  resultArea: {
    flex: 1,
    overflowY: "auto",
    padding: "40px 10%",
    display: "flex",
    flexDirection: "column",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: "15vh",
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "#ececec",
    letterSpacing: "-0.3px",
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  spinner: {
    width: 28,
    height: 28,
    border: "2.5px solid #222",
    borderTop: "2.5px solid #aaa",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    marginBottom: 12,
  },
  resultCard: {
    background: "#111111",
    border: "1px solid #222222",
    borderRadius: 14,
    padding: "28px 32px",
    maxWidth: 760,
    width: "100%",
    margin: "0 auto",
  },
  resultSection: {
    marginBottom: 4,
  },
  resultSectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  tag: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#555",
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 5,
    padding: "2px 8px",
    marginBottom: 10,
  },
  tagGreen: {
    color: "#4ade80",
    background: "#0d2818",
    border: "1px solid #166534",
    marginBottom: 0,
  },
  originalText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 1.7,
    wordBreak: "break-word",
  },
  optimizedText: {
    fontSize: 15,
    color: "#ececec",
    lineHeight: 1.8,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  copyBtn: {
    fontSize: 12,
    fontWeight: 500,
    color: "#aaa",
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 6,
    padding: "4px 12px",
    cursor: "pointer",
  },
  divider: {
    height: 1,
    background: "#1e1e1e",
    margin: "20px 0",
  },
  statsRow: {
    display: "flex",
    gap: 12,
  },
  statBox: {
    flex: 1,
    background: "#0f0f0f",
    border: "1px solid #1e1e1e",
    borderRadius: 8,
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#444",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statValue: {
    fontSize: 20,
    fontWeight: 600,
    color: "#ececec",
    letterSpacing: "-0.4px",
  },

  // Input
  inputArea: {
    padding: "16px 10%",
    borderTop: "1px solid #1e1e1e",
    background: "#0a0a0a",
  },
  errorText: {
    fontSize: 13,
    color: "#f87171",
    marginBottom: 8,
    paddingLeft: 4,
  },
  inputBox: {
    background: "#111111",
    border: "1px solid #222222",
    borderRadius: 12,
    overflow: "hidden",
    maxWidth: 760,
    margin: "0 auto",
    boxShadow: "0 1px 8px rgba(0,0,0,0.4)",
  },
  textarea: {
    width: "100%",
    minHeight: 72,
    maxHeight: 240,
    padding: "16px 18px 8px",
    fontSize: 14,
    lineHeight: 1.7,
    color: "#ececec",
    background: "transparent",
    border: "none",
    outline: "none",
    resize: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  inputFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 14px 12px",
  },
  hint: {
    fontSize: 12,
    color: "#333",
  },
  submitBtn: {
    background: "#ececec",
    color: "#0a0a0a",
    border: "none",
    borderRadius: 8,
    padding: "9px 20px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "-0.1px",
    transition: "opacity 0.15s",
  },

  modelSelector: {
  display: "flex",
  alignItems: "center",
  gap: 6,
},
modelIcon: {
  fontSize: 13,
  color: "#444",
},
modelSelect: {
  background: "transparent",
  border: "none",
  outline: "none",
  color: "#555",
  fontSize: 12,
  fontFamily: "inherit",
  cursor: "pointer",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
},
};
