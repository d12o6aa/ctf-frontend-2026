import React, { useState, useEffect, useRef, useCallback } from "react";

/* =============================================================================
   DESIGN SYSTEM — "Threat Console"
   -----------------------------------------------------------------------------
   Color   --void #090C10 (base) · --panel #10151C (surface) · --line #1E2732
           (hairline) · --ink #DCE4EC (text) · --dim #5B6B7A (muted) ·
           --brand #6E8FFF (actions/identity) · --safe #3DDC84 (cleared) ·
           --breach #FF5470 (blocked) · --warn #F5A623 (decay/hint)
   Type    Space Grotesk (display, restrained) · IBM Plex Mono (system data:
           scores, session ids, flags, timestamps, log tags) · Inter (chat
           prose — needs to read easily during a live event)
   Motion  One-shot reveals, a breathing "engine" heartbeat, and a single
           marquee ticker. No looping glitch/scanline noise.
   Signature  A live Threat Ticker — cross-team activity streamed like a
           breaking-news / stock ticker, built from leaderboard deltas +
           local session events, so the room feels like it's watching a live
           system rather than a static chat window.
   ============================================================================= */

const FONT_IMPORTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
`;

const GLOBAL_KEYFRAMES = `
@keyframes heartbeat { 0%,100% { opacity: .45; transform: scale(1); } 50% { opacity: 1; transform: scale(1.15); } }
@keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes breach-flash { 0% { box-shadow: 0 0 0 0 rgba(255,84,112,0.55); } 100% { box-shadow: 0 0 0 14px rgba(255,84,112,0); } }
@keyframes ring-expand { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(2.4); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .rise, .heartbeat-dot, .ticker-track, .breach-bubble, .ring { animation: none !important; }
}
`;

/* ---------------------------------------------------------------------------
   CONFIG
   -------------------------------------------------------------------------*/
const API_BASE = "https://ox-vault-backend-2026-cb729bd57697.herokuapp.com";

// Placeholder roster until a real GET /challenges route exists.
const CHALLENGES = [
  { id: 1, name: "The Vault Guard", tier: "01", flagFormat: "FLAG{...}", brief: "A banking assistant hardened against direct requests. Find the seam." },
  { id: 2, name: "The Whispering Oracle", tier: "02", flagFormat: "FLAG{...}", brief: "It answers everything except the one thing you need." },
  { id: 3, name: "Echo Chamber", tier: "03", flagFormat: "FLAG{...}", brief: "The model repeats context back — carefully, or not so carefully." },
];

/* ---------------------------------------------------------------------------
   PRIMITIVES
   -------------------------------------------------------------------------*/

function EngineHeartbeat({ status = "safe" }) {
  const color = status === "breach" ? "#FF5470" : status === "warn" ? "#F5A623" : "#3DDC84";
  return (
    <span className="relative flex h-2 w-2">
      <span
        className="heartbeat-dot absolute inline-flex h-full w-full rounded-full"
        style={{ backgroundColor: color, animation: "heartbeat 1.6s ease-in-out infinite" }}
      />
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

function LogTag({ kind }) {
  const map = {
    cleared: { label: "CLEARED", color: "#3DDC84", bg: "rgba(61,220,132,0.12)" },
    blocked: { label: "BLOCKED", color: "#FF5470", bg: "rgba(255,84,112,0.12)" },
    decay: { label: "DECAY", color: "#F5A623", bg: "rgba(245,166,35,0.12)" },
    flag: { label: "FLAG", color: "#6E8FFF", bg: "rgba(110,143,255,0.14)" },
  };
  const c = map[kind];
  if (!c) return null;
  return (
    <span
      className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider"
      style={{ color: c.color, backgroundColor: c.bg }}
    >
      {c.label}
    </span>
  );
}

function timeNow() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

/* ---------------------------------------------------------------------------
   LIVE THREAT TICKER — signature element
   -------------------------------------------------------------------------*/

function ThreatTicker({ events }) {
  if (events.length === 0) return null;
  // Duplicate the list so the marquee loops seamlessly.
  const loop = [...events, ...events];
  return (
    <div className="overflow-hidden border-b border-[#1E2732] bg-[#0C1117] py-1.5">
      <div
        className="ticker-track flex w-max gap-10 whitespace-nowrap"
        style={{ animation: "ticker-scroll 32s linear infinite" }}
      >
        {loop.map((e, i) => (
          <span key={i} className="flex items-center gap-2 font-mono text-[11px] text-[#5B6B7A]">
            <span className="text-[#3A4552]">//</span>
            <span className="text-[#8593A3]">{e.time}</span>
            <span style={{ color: e.color || "#8593A3" }}>{e.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   LOGIN
   -------------------------------------------------------------------------*/

function LoginScreen({ onLogin, loading, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!username || !password) return;
    onLogin(username, password);
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#090C10]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#DCE4EC 1px, transparent 1px), linear-gradient(90deg, #DCE4EC 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      <div className="rise relative w-full max-w-[380px] px-6" style={{ animation: "rise .5s ease-out" }}>
        <div className="mb-8 flex items-center gap-2.5">
          <EngineHeartbeat status="safe" />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#5B6B7A]">
            arabguard uplink — nominal
          </span>
        </div>

        <h1
          className="mb-1.5 text-[28px] font-semibold leading-none text-[#DCE4EC]"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Operator Access
        </h1>
        <p className="mb-8 text-[13px] text-[#5B6B7A]">
          Sign in with the credentials issued to your team.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[#5B6B7A]">
              Callsign
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-[#1E2732] bg-[#10151C] px-3.5 py-2.5 font-mono text-sm text-[#DCE4EC] outline-none transition focus:border-[#6E8FFF]"
              placeholder="Team_Alpha"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[#5B6B7A]">
              Access Key
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-[#1E2732] bg-[#10151C] px-3.5 py-2.5 font-mono text-sm text-[#DCE4EC] outline-none transition focus:border-[#6E8FFF]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-md border border-[#FF5470]/30 bg-[#FF5470]/10 px-3 py-2 font-mono text-[11px] text-[#FF5470]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md py-2.5 text-[14px] font-semibold text-[#090C10] transition disabled:opacity-50"
            style={{ backgroundColor: "#6E8FFF", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {loading ? "Authenticating…" : "Establish Session"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   OBJECTIVE SELECTOR
   -------------------------------------------------------------------------*/

function ObjectiveSelector({ onSelect, onClose }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#090C10]/90 backdrop-blur-sm">
      <div className="rise w-full max-w-lg px-4" style={{ animation: "rise .35s ease-out" }}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5B6B7A]">
              select target
            </div>
            <h2
              className="text-xl font-semibold text-[#DCE4EC]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Choose an Objective
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-[#1E2732] px-2 py-1 font-mono text-xs text-[#5B6B7A] hover:text-[#DCE4EC]"
          >
            esc
          </button>
        </div>

        <div className="space-y-2.5">
          {CHALLENGES.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="group flex w-full items-start gap-4 rounded-lg border border-[#1E2732] bg-[#10151C] p-4 text-left transition hover:border-[#6E8FFF]/50 hover:bg-[#131A23]"
            >
              <span
                className="font-mono text-xs text-[#3A4552] transition group-hover:text-[#6E8FFF]"
                style={{ marginTop: "2px" }}
              >
                {c.tier}
              </span>
              <div className="flex-1">
                <div className="font-medium text-[#DCE4EC]">{c.name}</div>
                <div className="mt-0.5 text-[12.5px] leading-snug text-[#5B6B7A]">{c.brief}</div>
                <div className="mt-2 font-mono text-[10px] text-[#3A4552]">
                  flag format · {c.flagFormat}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   ACCESS GRANTED (flag capture) — restrained, thematic in place of confetti
   -------------------------------------------------------------------------*/

function AccessGrantedOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="ring absolute h-40 w-40 rounded-full border-2"
          style={{
            borderColor: "#3DDC84",
            animation: `ring-expand 1.4s ease-out ${i * 0.25}s forwards`,
          }}
        />
      ))}
      <div
        className="rise rounded-lg border border-[#3DDC84]/50 bg-[#0C1117] px-8 py-4 text-center shadow-[0_0_60px_rgba(61,220,132,0.25)]"
        style={{ animation: "rise .4s ease-out" }}
      >
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#3DDC84]">
          access granted
        </div>
        <div
          className="mt-1 text-xl font-semibold text-[#DCE4EC]"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Flag Captured
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   CHAT TRANSCRIPT
   -------------------------------------------------------------------------*/

function TranscriptLine({ msg }) {
  if (msg.role === "system") {
    return (
      <div
        className="rise mx-auto my-2 flex max-w-lg items-center gap-2 rounded-md border border-[#F5A623]/30 bg-[#F5A623]/[0.07] px-3.5 py-2 font-mono text-[11.5px] text-[#F5A623]"
        style={{ animation: "rise .3s ease-out" }}
      >
        <LogTag kind="decay" />
        {msg.content}
      </div>
    );
  }

  const isUser = msg.role === "user";
  const isBlocked = !isUser && msg.content.includes("ArabGuard Defense Triggered");
  const hasFlag = !isUser && msg.content.includes("FLAG{");

  return (
    <div
      className={`rise mb-4 flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      style={{ animation: "rise .3s ease-out" }}
    >
      <span className="mt-1 flex-none font-mono text-[10px] text-[#3A4552]">{msg.time}</span>
      <div
        className={[
          "max-w-[68%] rounded-lg px-4 py-3 text-[14px] leading-relaxed",
          isUser
            ? "bg-[#1B2431] text-[#DCE4EC]"
            : isBlocked
            ? "breach-bubble border border-[#FF5470] bg-[#FF5470]/[0.08] text-[#FFD9DF]"
            : "border border-[#1E2732] bg-[#10151C] text-[#DCE4EC]",
        ].join(" ")}
        style={isBlocked ? { animation: "breach-flash .6s ease-out" } : undefined}
      >
        {!isUser && (
          <div className="mb-1.5 flex items-center gap-1.5">
            {isBlocked ? <LogTag kind="blocked" /> : <LogTag kind="cleared" />}
            {hasFlag && <LogTag kind="flag" />}
          </div>
        )}
        {msg.content}
      </div>
    </div>
  );
}

function ThinkingLine() {
  return (
    <div className="mb-4 flex items-center gap-2 pl-9 font-mono text-[12px] text-[#5B6B7A]">
      <EngineHeartbeat status="safe" />
      analyzing prompt · arabguard + model in flight
    </div>
  );
}

/* ---------------------------------------------------------------------------
   SIDEBAR (console)
   -------------------------------------------------------------------------*/

function Console({ team, leaderboard, activeChallenge, chatMessages, onNewChat }) {
  return (
    <aside className="flex h-full w-[300px] flex-none flex-col border-r border-[#1E2732] bg-[#0B0F14]">
      <div className="border-b border-[#1E2732] px-5 py-5">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5B6B7A]">
          genai security ctf
        </div>
        <div className="flex items-baseline justify-between">
          <span className="font-medium text-[#DCE4EC]">{team?.team_name}</span>
          <span className="font-mono text-[15px] text-[#3DDC84]">{team?.total_score ?? 0}</span>
        </div>
      </div>

      <div className="border-b border-[#1E2732] px-5 py-4">
        <h3 className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5B6B7A]">
          Standings
        </h3>
        <div className="space-y-1">
          {leaderboard.slice(0, 5).map((entry, i) => {
            const isMe = entry.team_name === team?.team_name;
            return (
              <div
                key={entry.team_name}
                className={`flex items-center justify-between rounded px-2 py-1.5 font-mono text-[12px] ${
                  isMe ? "bg-[#6E8FFF]/10 text-[#6E8FFF]" : "text-[#5B6B7A]"
                }`}
              >
                <span className="truncate">
                  <span className="text-[#3A4552]">{String(i + 1).padStart(2, "0")}</span> {entry.team_name}
                </span>
                <span>{entry.total_score}</span>
              </div>
            );
          })}
          {leaderboard.length === 0 && (
            <div className="font-mono text-[11px] text-[#3A4552]">no data yet</div>
          )}
        </div>
      </div>

      <div className="border-b border-[#1E2732] px-5 py-4">
        <h3 className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5B6B7A]">
          Target Profile
        </h3>
        {activeChallenge ? (
          <div className="rounded-md border border-[#1E2732] bg-[#10151C] p-3">
            <div className="font-mono text-[10px] text-[#3A4552]">TIER {activeChallenge.tier}</div>
            <div className="mt-0.5 text-[13.5px] text-[#DCE4EC]">{activeChallenge.name}</div>
            <div className="mt-1.5 font-mono text-[10.5px] text-[#5B6B7A]">
              flag · {activeChallenge.flagFormat}
            </div>
          </div>
        ) : (
          <div className="font-mono text-[11px] text-[#3A4552]">no active engagement</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h3 className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5B6B7A]">
          Command History
        </h3>
        <div className="space-y-1">
          {chatMessages
            .filter((m) => m.role === "user")
            .map((m, i) => (
              <div
                key={i}
                className="truncate rounded px-1.5 py-1 font-mono text-[11px] text-[#5B6B7A] hover:bg-[#10151C]"
                title={m.content}
              >
                <span className="text-[#3A4552]">$</span> {m.content}
              </div>
            ))}
          {chatMessages.filter((m) => m.role === "user").length === 0 && (
            <div className="font-mono text-[11px] text-[#3A4552]">no commands issued</div>
          )}
        </div>
      </div>

      <div className="border-t border-[#1E2732] p-4">
        <button
          onClick={onNewChat}
          className="w-full rounded-md border border-[#6E8FFF]/40 bg-[#6E8FFF]/10 py-2.5 text-[13.5px] font-medium text-[#6E8FFF] transition hover:bg-[#6E8FFF]/[0.18]"
        >
          + New Engagement
        </button>
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------------------------
   COMPOSER
   -------------------------------------------------------------------------*/

function Composer({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const MAX = 4000;

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
  };

  return (
    <div className="border-t border-[#1E2732] bg-[#0B0F14] p-4">
      <div className="flex items-end gap-3 rounded-lg border border-[#1E2732] bg-[#10151C] px-4 py-3 transition focus-within:border-[#6E8FFF]/60">
        <textarea
          value={value}
          onChange={(e) => e.target.value.length <= MAX && setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          disabled={disabled}
          placeholder={disabled ? "Select an objective to begin…" : "Draft your prompt…"}
          className="max-h-32 flex-1 resize-none bg-transparent text-[14px] text-[#DCE4EC] outline-none placeholder:text-[#3A4552]"
        />
        <span className="mb-1 font-mono text-[10px] text-[#3A4552]">
          {value.length}/{MAX}
        </span>
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[#090C10] transition disabled:opacity-30"
          style={{ backgroundColor: "#6E8FFF" }}
          aria-label="Send"
        >
          ↑
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   MAIN APP
   -------------------------------------------------------------------------*/

export default function App() {
  const [team, setTeam] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const [leaderboard, setLeaderboard] = useState([]);
  const prevScoresRef = useRef({});
  const [sessionId, setSessionId] = useState(null);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showAccessGranted, setShowAccessGranted] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [tickerEvents, setTickerEvents] = useState([
    { time: timeNow(), text: "arabguard uplink established", color: "#3DDC84" },
  ]);
  const [engineStatus, setEngineStatus] = useState("safe");

  const scrollRef = useRef(null);

  const pushTicker = useCallback((text, color) => {
    setTickerEvents((prev) => [...prev.slice(-14), { time: timeNow(), text, color }]);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/leaderboard`);
      if (!res.ok) throw new Error("leaderboard fetch failed");
      const data = await res.json();

      // Diff against previous scores to synthesize live ticker events for
      // OTHER teams' progress — this is what makes the console feel live.
      const prev = prevScoresRef.current;
      data.forEach((entry) => {
        const before = prev[entry.team_name];
        if (before !== undefined && entry.total_score > before) {
          pushTicker(`${entry.team_name} advanced — +${entry.total_score - before} pts`, "#6E8FFF");
        }
      });
      prevScoresRef.current = Object.fromEntries(data.map((e) => [e.team_name, e.total_score]));

      setLeaderboard(data);
    } catch (err) {
      console.error(err);
    }
  }, [pushTicker]);

  useEffect(() => {
    if (!team) return;
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, [team, fetchLeaderboard]);

  const handleLogin = async (username, password) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Invalid callsign or access key." : "Login failed.");
      }
      const data = await res.json();
      setTeam(data);
    } catch (err) {
      setLoginError(
        err instanceof TypeError
          ? "Could not reach the server. Check your connection or try again."
          : err.message
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setActiveChallenge(null);
    setChatError(null);
    setShowObjectiveModal(true);
  };

  const selectObjective = async (challenge) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: team.team_id, challenge_id: challenge.id }),
      });
      if (!res.ok) throw new Error("Could not start session.");
      const data = await res.json();
      setSessionId(data.session_id);
      setActiveChallenge(challenge);
      setShowObjectiveModal(false);
      pushTicker(`${team.team_name} engaged ${challenge.name}`, "#5B6B7A");
    } catch (err) {
      setChatError(err.message);
      setShowObjectiveModal(false);
    }
  };

  const sendMessage = async (text) => {
    if (!sessionId) return;
    setChatError(null);
    setMessages((prev) => [...prev, { role: "user", content: text, time: timeNow() }]);
    setIsThinking(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, user_prompt: text }),
      });
      if (!res.ok) throw new Error("The assistant did not respond.");
      const data = await res.json();

      const blocked = data.ai_response?.includes("ArabGuard Defense Triggered");
      setEngineStatus(blocked ? "breach" : "safe");

      setMessages((prev) => [...prev, { role: "ai", content: data.ai_response, time: timeNow() }]);

      if (blocked) {
        pushTicker(`${team.team_name} triggered a defense block`, "#FF5470");
      }

      if (data.new_hints) {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: `Time-based hint revealed: ${data.new_hints}`, time: timeNow() },
        ]);
        pushTicker(`${team.team_name} unlocked a hint — score decayed`, "#F5A623");
      }

      if (typeof data.current_score === "number") {
        setTeam((prev) => ({ ...prev, total_score: data.current_score }));
      }

      if (data.is_flag_revealed) {
        setShowAccessGranted(true);
        pushTicker(`${team.team_name} captured the flag on ${activeChallenge?.name}`, "#3DDC84");
        setTimeout(() => setShowAccessGranted(false), 2600);
      }

      fetchLeaderboard();
    } catch (err) {
      setChatError(err.message);
      setMessages((prev) => [...prev, { role: "system", content: `Error: ${err.message}`, time: timeNow() }]);
    } finally {
      setIsThinking(false);
    }
  };

  const globalStyle = FONT_IMPORTS + GLOBAL_KEYFRAMES;

  if (!team) {
    return (
      <>
        <style>{globalStyle}</style>
        <LoginScreen onLogin={handleLogin} loading={loginLoading} error={loginError} />
      </>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[#090C10]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{globalStyle}</style>
      {showAccessGranted && <AccessGrantedOverlay />}

      {/* Top status bar */}
      <div className="flex items-center justify-between border-b border-[#1E2732] bg-[#0B0F14] px-5 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[11px] text-[#5B6B7A]">
          <EngineHeartbeat status={engineStatus} />
          arabguard engine — {engineStatus === "breach" ? "block issued" : "monitoring"}
        </div>
        {sessionId && (
          <span className="font-mono text-[10px] text-[#3A4552]">session · {sessionId.slice(0, 8)}…</span>
        )}
      </div>

      <ThreatTicker events={tickerEvents} />

      <div className="flex min-h-0 flex-1">
        <Console
          team={team}
          leaderboard={leaderboard}
          activeChallenge={activeChallenge}
          chatMessages={messages}
          onNewChat={startNewChat}
        />

        <main className="relative flex flex-1 flex-col">
          <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-6 py-5">
            {!sessionId && !showObjectiveModal && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="mb-3 font-mono text-[13px] text-[#3A4552]">no active engagement</p>
                <button
                  onClick={startNewChat}
                  className="rounded-md border border-[#6E8FFF]/40 px-4 py-2 text-[13.5px] text-[#6E8FFF] hover:bg-[#6E8FFF]/10"
                >
                  + New Engagement
                </button>
              </div>
            )}

            {messages.map((m, i) => (
              <TranscriptLine key={i} msg={m} />
            ))}

            {isThinking && <ThinkingLine />}

            {chatError && (
              <div className="mx-auto my-2 max-w-lg rounded-md border border-[#FF5470]/30 bg-[#FF5470]/10 px-3.5 py-2 text-center font-mono text-[11.5px] text-[#FF5470]">
                {chatError}
              </div>
            )}

            {showObjectiveModal && (
              <ObjectiveSelector onSelect={selectObjective} onClose={() => setShowObjectiveModal(false)} />
            )}
          </div>

          <Composer onSend={sendMessage} disabled={!sessionId || isThinking} />
        </main>
      </div>
    </div>
  );
}