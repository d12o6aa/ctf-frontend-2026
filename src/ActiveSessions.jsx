import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Radio, AlertTriangle, XCircle } from "lucide-react";

const API_BASE = "https://ox-vault-backend-2026-cb729bd57697.herokuapp.com";
const REFRESH_MS = 15000;

async function adminFetch(path, adminKey, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "X-Admin-Key": adminKey || "",
    },
  });
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  return `منذ ${hrs} س ${mins % 60} د`;
}

export default function ActiveSessions({ adminKey }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSessions = useCallback(async () => {
    try {
      const res = await adminFetch("/admin/sessions/active", adminKey);
      if (res.ok) {
        setSessions(await res.json());
      }
    } catch (err) {
      console.error("Failed to load active sessions", err);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleTerminate = async (session) => {
    if (!window.confirm(`إنهاء جلسة "${session.team_name}" في تحدي "${session.challenge_name}"؟ الفريق مش هيقدر يبعت رسايل تانية في الجلسة دي.`)) {
      return;
    }
    setTerminating(session.session_id);
    try {
      const res = await adminFetch(`/admin/sessions/${session.session_id}/terminate`, adminKey, {
        method: "POST",
      });
      if (res.ok) {
        showToast(`تم إنهاء جلسة ${session.team_name} ✅`);
        setSessions((prev) => prev.filter((s) => s.session_id !== session.session_id));
      } else if (res.status !== 403) {
        showToast("تعذر إنهاء الجلسة", "error");
      }
    } catch (err) {
      showToast("خطأ في الاتصال", "error");
    } finally {
      setTerminating(null);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border-t-4 border-orange-500">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Radio size={20} className="text-orange-500" />
          الجلسات النشطة الآن
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
            {sessions.length}
          </span>
        </h2>
        <button
          onClick={fetchSessions}
          className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={13} /> تحديث الآن
        </button>
      </div>

      {toast && (
        <div className={`mb-4 rounded-lg p-3 text-sm font-bold text-white ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
          {toast.text}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm font-bold text-gray-400">جاري التحميل...</div>
      ) : (
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-right text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b bg-gray-50 text-gray-600">
                <th className="p-2">الفريق</th>
                <th className="p-2">التحدي</th>
                <th className="p-2">بدأت</th>
                <th className="p-2">المحاولات</th>
                <th className="p-2">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.session_id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-bold text-blue-600">{s.team_name}</td>
                  <td className="p-2 text-gray-700">{s.challenge_name}</td>
                  <td className="p-2 text-xs text-gray-500">{timeAgo(s.created_at)}</td>
                  <td className="p-2 font-bold text-gray-700">{s.attempts_count}</td>
                  <td className="p-2">
                    <button
                      onClick={() => handleTerminate(s)}
                      disabled={terminating === s.session_id}
                      className="flex items-center gap-1 rounded bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-red-700 disabled:opacity-50"
                    >
                      <AlertTriangle size={13} />
                      {terminating === s.session_id ? "جاري الإنهاء..." : "إنهاء / طرد"}
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm font-bold text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={20} className="text-gray-300" />
                      لا توجد جلسات نشطة حالياً
                    </div>
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