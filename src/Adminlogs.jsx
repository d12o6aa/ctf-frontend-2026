import React, { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Search, Flag, ShieldAlert, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";

const API_BASE = "https://ox-vault-backend-2026-cb729bd57697.herokuapp.com";
const REFRESH_MS = 10000;

// نفس نمط adminFetch المستخدم في AdminDashboard.jsx — مكرر هنا عمداً عشان
// المكوّن ده يفضل مستقل وقابل للنقل بسهولة.
async function adminFetch(path, adminKey, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "X-Admin-Key": adminKey || "",
    },
  });
}

function StatusBadges({ log }) {
  return (
    <div className="flex flex-wrap gap-1">
      {log.role === "ai" && log.is_blocked && (
        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
          <ShieldAlert size={12} /> محظور
        </span>
      )}
      {log.role === "ai" && !log.is_blocked && (
        <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
          سليم
        </span>
      )}
      {log.is_flag_revealed && (
        <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
          <Flag size={12} /> فلاج
        </span>
      )}
      <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
        {log.role === "user" ? "طالب" : "الموديل"}
      </span>
    </div>
  );
}

export default function AdminLogs({ adminKey }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState("");
  const [challengeFilter, setChallengeFilter] = useState("all");
  const [flagOnly, setFlagOnly] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await adminFetch("/admin/logs", adminKey);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Failed to load logs", err);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const challengeNames = useMemo(() => {
    const set = new Set(logs.map((l) => l.challenge_name));
    return ["all", ...Array.from(set)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (teamFilter && !l.team_name.toLowerCase().includes(teamFilter.toLowerCase())) return false;
      if (challengeFilter !== "all" && l.challenge_name !== challengeFilter) return false;
      if (flagOnly && !l.is_flag_revealed) return false;
      return true;
    });
  }, [logs, teamFilter, challengeFilter, flagOnly]);

  // كل رسائل نفس الجلسة، مرتبة من الأقدم للأحدث — لعرض السياق الكامل.
  const sessionContext = useMemo(() => {
    if (!expandedSession) return [];
    return logs
      .filter((l) => l.session_id === expandedSession)
      .slice()
      .reverse();
  }, [logs, expandedSession]);

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border-t-4 border-indigo-500">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <MessageSquare size={20} className="text-indigo-500" />
          المراقبة الحية / سجل المحادثات
        </h2>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
          {lastUpdated && <span>آخر تحديث: {lastUpdated.toLocaleTimeString("ar-EG")}</span>}
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={13} /> تحديث الآن
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-2 rounded border border-gray-200 bg-white px-2 py-1.5">
          <Search size={14} className="text-gray-400" />
          <input
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            placeholder="فلترة باسم الفريق..."
            className="w-40 text-sm outline-none"
          />
        </div>
        <select
          value={challengeFilter}
          onChange={(e) => setChallengeFilter(e.target.value)}
          className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none"
        >
          {challengeNames.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "كل التحديات" : c}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-gray-700">
          <input type="checkbox" checked={flagOnly} onChange={(e) => setFlagOnly(e.target.checked)} />
          فلاج فقط
        </label>
        <span className="mr-auto text-xs font-bold text-gray-400">
          {filteredLogs.length} من {logs.length} رسالة
        </span>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm font-bold text-gray-400">جاري تحميل السجل...</div>
      ) : (
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-right text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b bg-gray-50 text-gray-600">
                <th className="p-2">الوقت</th>
                <th className="p-2">الفريق</th>
                <th className="p-2">التحدي</th>
                <th className="p-2">الحالة</th>
                <th className="p-2">معاينة الرسالة</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const isExpanded = expandedSession === log.session_id;
                return (
                  <React.Fragment key={log.message_id}>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="whitespace-nowrap p-2 text-xs text-gray-500">{log.timestamp}</td>
                      <td className="p-2 font-bold text-blue-600">{log.team_name}</td>
                      <td className="p-2 text-gray-700">{log.challenge_name}</td>
                      <td className="p-2"><StatusBadges log={log} /></td>
                      <td className="max-w-xs truncate p-2 text-gray-700" title={log.content}>
                        {log.content}
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => setExpandedSession(isExpanded ? null : log.session_id)}
                          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? "إخفاء" : "التفاصيل"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 p-4">
                          <div className="mb-2 text-xs font-bold text-gray-500">
                            المحادثة كاملة — جلسة {log.session_id.slice(0, 8)}
                          </div>
                          <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
                            {sessionContext.map((m) => (
                              <div
                                key={m.message_id}
                                className={`rounded-lg p-2 text-xs ${
                                  m.role === "user"
                                    ? "bg-blue-50 text-blue-900"
                                    : m.is_blocked
                                    ? "bg-red-50 text-red-900"
                                    : "bg-gray-50 text-gray-800"
                                }`}
                              >
                                <div className="mb-1 flex items-center justify-between text-[10px] font-bold opacity-70">
                                  <span>{m.role === "user" ? "الطالب" : "الموديل"}</span>
                                  <span>{m.timestamp}</span>
                                </div>
                                <div className="whitespace-pre-wrap">{m.content}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm font-bold text-gray-400">
                    لا توجد رسائل مطابقة للفلاتر الحالية
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}