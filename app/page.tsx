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
  timestamp: string;
}

const MODELS = [
  { provider: "NVIDIA", name: "Nemotron 3 Super", slug: "nvidia/nemotron-3-super-120b-a12b:free" },
  { provider: "Poolside", name: "Laguna M.1", slug: "poolside/laguna-m.1:free" },
  { provider: "OpenInference", name: "GPT-OSS 120B", slug: "openai/gpt-oss-120b:free" },
  { provider: "Z.ai", name: "GLM 4.5 Air", slug: "z-ai/glm-4.5-air:free" },
  { provider: "Crucible", name: "DeepSeek V4 Flash", slug: "deepseek/deepseek-v4-flash:free" },
  { provider: "Arcee AI", name: "Trinity Large Thinking", slug: "arcee-ai/trinity-large-thinking:free" },
  { provider: "Poolside", name: "Laguna XS.2", slug: "poolside/laguna-xs.2:free" },
  { provider: "Baidu", name: "CoBuddy", slug: "baidu/cobuddy:free" },
];

const STORAGE_KEY = "prompteng_history";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].slug);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const active = history.find((h) => h.id === activeId) ?? null;

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      console.error("Failed to load history");
    }
  }, []);

  // On mobile, sidebar closed by default
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }, [prompt]);

  function saveHistory(items: HistoryItem[]) {
    setHistory(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      console.error("Failed to save history");
    }
  }

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
        timestamp: new Date().toISOString(),
      };

      const updated = [item, ...history];
      saveHistory(updated);
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

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = history.filter((h) => h.id !== id);
    saveHistory(updated);
    if (activeId === id) setActiveId(updated[0]?.id ?? null);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function truncate(str: string, n: number) {
    return str.length > n ? str.slice(0, n) + "..." : str;
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; background: #0a0a0a; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .history-item:hover { background: #1a1a1a !important; }
        .history-item:hover .delete-btn { opacity: 1 !important; }
        .new-btn:hover { background: #1a1a1a !important; }
        .submit-btn:hover:not(:disabled) { background: #d4d4d4 !important; }
        .copy-btn:hover { background: #222 !important; }
        textarea::placeholder { color: #333; }
        select option { background: #111; color: #ececec; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 99px; }
        .result-card { animation: fadeIn 0.25s ease; }
        .overlay { display: none; }
        @media (max-width: 768px) {
          .overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10; }
          .sidebar { position: fixed !important; z-index: 20; height: 100vh; }
        }
      `}</style>

      <div style={{
        display: "flex",
        height: "100vh",
        background: "#0a0a0a",
        fontFamily: "'Inter', sans-serif",
        color: "#ececec",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <aside className="sidebar" style={{
            width: 260,
            minWidth: 260,
            background: "#111",
            borderRight: "1px solid #222",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            transition: "transform 0.2s ease",
          }}>
            <div style={{
              padding: "16px",
              borderBottom: "1px solid #222",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.2px" }}>
                ⚡ PromptEng
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#555",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: "2px 4px",
                  borderRadius: 4,
                }}
              >
                ✕
              </button>
            </div>

            <div
              className="new-btn"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                margin: "10px 10px 4px", padding: "9px 12px",
                borderRadius: 8, fontSize: 13.5, fontWeight: 500,
                color: "#ccc", cursor: "pointer", background: "transparent",
              }}
              onClick={() => {
                setActiveId(null);
                setPrompt("");
                setError("");
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
            >
              <span style={{ fontSize: 16 }}>＋</span> New prompt
            </div>

            <div style={{
              fontSize: 11, fontWeight: 600, color: "#444",
              letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "12px 16px 6px",
            }}>
              History
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 16px" }}>
              {history.length === 0 && (
                <p style={{ fontSize: 13, color: "#444", padding: "12px 8px" }}>
                  No history yet
                </p>
              )}
              {history.map((item) => (
                <div
                  key={item.id}
                  className="history-item"
                  style={{
                    padding: "9px 10px", borderRadius: 8, cursor: "pointer",
                    marginBottom: 2, position: "relative",
                    background: activeId === item.id ? "#1e1e1e" : "transparent",
                  }}
                  onClick={() => {
                    setActiveId(item.id);
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                >
                  <p style={{
                    fontSize: 13, color: "#ccc", lineHeight: 1.45,
                    marginBottom: 2, wordBreak: "break-word", paddingRight: 20,
                  }}>
                    {truncate(item.original, 52)}
                  </p>
                  <span style={{ fontSize: 11, color: "#555" }}>
                    {formatTime(item.timestamp)}
                  </span>
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDelete(item.id, e)}
                    style={{
                      position: "absolute", top: 8, right: 8,
                      background: "none", border: "none", color: "#555",
                      cursor: "pointer", fontSize: 13, opacity: 0,
                      transition: "opacity 0.15s", padding: "2px 4px",
                      borderRadius: 3,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {history.length > 0 && (
              <div style={{ padding: "10px 16px", borderTop: "1px solid #1e1e1e" }}>
                <button
                  onClick={() => { saveHistory([]); setActiveId(null); }}
                  style={{
                    background: "none", border: "none", color: "#444",
                    fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Clear all history
                </button>
              </div>
            )}
          </aside>
        )}

        {/* ── Main ── */}
        <main style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}>

          {/* Top bar */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid #1a1a1a",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#0a0a0a",
          }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: "none", border: "none", color: "#555",
                cursor: "pointer", padding: "4px", borderRadius: 6,
                display: "flex", flexDirection: "column",
                gap: 4, alignItems: "center", justifyContent: "center",
              }}
              aria-label="Toggle sidebar"
            >
              <span style={{ display: "block", width: 18, height: 1.5, background: "#666", borderRadius: 2 }} />
              <span style={{ display: "block", width: 18, height: 1.5, background: "#666", borderRadius: 2 }} />
              <span style={{ display: "block", width: 18, height: 1.5, background: "#666", borderRadius: 2 }} />
            </button>
            <span style={{ fontSize: 14, color: "#444", fontWeight: 500 }}>
              {active ? truncate(active.original, 60) : "Prompt Engineer"}
            </span>
          </div>

          {/* Result area */}
          <div style={{
            flex: 1, overflowY: "auto",
            padding: "32px 5%",
            display: "flex",
            flexDirection: "column",
          }}>
            {!active && !loading && (
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 8, marginTop: "12vh",
              }}>
                <p style={{ fontSize: 20, fontWeight: 600, color: "#ececec", letterSpacing: "-0.3px" }}>
                  Paste any prompt below
                </p>
                <p style={{ fontSize: 14, color: "#555", marginTop: 4 }}>
                  Your optimized, well-engineered prompt will appear here
                </p>
              </div>
            )}

            {loading && (
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                <div style={{
                  width: 28, height: 28,
                  border: "2.5px solid #222",
                  borderTop: "2.5px solid #aaa",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                <p style={{ fontSize: 14, color: "#555" }}>Engineering your prompt...</p>
              </div>
            )}

            {active && !loading && (
              <div className="result-card" style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 14,
                padding: "24px",
                maxWidth: 760,
                width: "100%",
                margin: "0 auto",
              }}>
                {/* Original */}
                <div style={{ marginBottom: 4 }}>
                  <span style={{
                    display: "inline-block", fontSize: 11, fontWeight: 600,
                    letterSpacing: "0.05em", textTransform: "uppercase",
                    color: "#555", background: "#1a1a1a", border: "1px solid #2a2a2a",
                    borderRadius: 5, padding: "2px 8px", marginBottom: 10,
                  }}>
                    Original
                  </span>
                  <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, wordBreak: "break-word" }}>
                    {active.original}
                  </p>
                </div>

                <div style={{ height: 1, background: "#1e1e1e", margin: "20px 0" }} />

                {/* Optimized */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{
                      display: "inline-block", fontSize: 11, fontWeight: 600,
                      letterSpacing: "0.05em", textTransform: "uppercase",
                      color: "#4ade80", background: "#0d2818",
                      border: "1px solid #166534", borderRadius: 5, padding: "2px 8px",
                    }}>
                      Optimized
                    </span>
                    <button
                      className="copy-btn"
                      onClick={handleCopy}
                      style={{
                        fontSize: 12, fontWeight: 500, color: "#aaa",
                        background: "#1a1a1a", border: "1px solid #2a2a2a",
                        borderRadius: 6, padding: "4px 12px", cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <p style={{
                    fontSize: 15, color: "#ececec", lineHeight: 1.8,
                    wordBreak: "break-word", whiteSpace: "pre-wrap",
                  }}>
                    {active.optimized}
                  </p>
                </div>

                <div style={{ height: 1, background: "#1e1e1e", margin: "20px 0" }} />

                {/* Stats */}
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { label: "Original tokens", value: active.stats.originalTokens, color: "#ececec" },
                    { label: "Engineered tokens", value: active.stats.optimizedTokens, color: "#ececec" },
                    {
                      label: "Complexity added",
                      value: active.stats.reduction > 0
                        ? `↓ ${active.stats.reduction}%`
                        : active.stats.reduction < 0
                        ? `+${Math.abs(active.stats.reduction)}%`
                        : "—",
                      color: "#4ade80",
                    },
                  ].map((s) => (
                    <div key={s.label} style={{
                      flex: 1, background: "#0f0f0f", border: "1px solid #1e1e1e",
                      borderRadius: 8, padding: "12px 14px",
                      display: "flex", flexDirection: "column", gap: 4,
                    }}>
                      <span style={{
                        fontSize: 10, color: "#444", fontWeight: 500,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                      }}>
                        {s.label}
                      </span>
                      <span style={{ fontSize: 18, fontWeight: 600, color: s.color, letterSpacing: "-0.4px" }}>
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Input area ── */}
          <div style={{
            padding: "12px 5%",
            borderTop: "1px solid #1a1a1a",
            background: "#0a0a0a",
          }}>
            {error && (
              <p style={{ fontSize: 13, color: "#f87171", marginBottom: 8, paddingLeft: 4 }}>
                {error}
              </p>
            )}
            <div style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: 12,
              overflow: "hidden",
              maxWidth: 760,
              margin: "0 auto",
              boxShadow: "0 1px 8px rgba(0,0,0,0.4)",
            }}>
              <textarea
                ref={textareaRef}
                style={{
                  width: "100%", minHeight: 72, maxHeight: 200,
                  padding: "14px 16px 8px", fontSize: 14, lineHeight: 1.7,
                  color: "#ececec", background: "transparent", border: "none",
                  outline: "none", resize: "none", fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
                placeholder="Paste your rough prompt here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                disabled={loading}
              />
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px 12px",
                flexWrap: "wrap",
                gap: 8,
              }}>
                {/* Model selector */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "#444" }}>⚙</span>
                  <select
                    style={{
                      background: "transparent", border: "none", outline: "none",
                      color: "#555", fontSize: 12, fontFamily: "inherit",
                      cursor: "pointer", maxWidth: 180,
                    }}
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
                  <span style={{ fontSize: 12, color: "#333" }}>⌘ + Enter</span>
                  <button
                    className="submit-btn"
                    style={{
                      background: "#ececec", color: "#0a0a0a", border: "none",
                      borderRadius: 8, padding: "8px 18px", fontSize: 13.5,
                      fontWeight: 600, cursor: "pointer", letterSpacing: "-0.1px",
                      fontFamily: "inherit",
                      opacity: !prompt.trim() || loading ? 0.45 : 1,
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
    </>
  );
}