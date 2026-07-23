import React, { useState, useEffect, useCallback } from "react";
import AdminLogs from "./AdminLogs";
import ActiveSessions from "./ActiveSessions";

const API_BASE = "https://ox-vault-backend-2026-cb729bd57697.herokuapp.com";

export default function AdminDashboard({ adminKey, onExit }) {
  const [teams, setTeams] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [stats, setStats] = useState({
    overview: {
      teams_count: 0,
      challenges_count: 0,
      active_sessions_count: 0,
      total_attempts: 0,
      total_blocked: 0,
      overall_blocked_rate: 0,
      is_active: false,
    },
    leaderboard: [],
    challenges: [],
  });
  const [isCompetitionActive, setIsCompetitionActive] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamPassword, setNewTeamPassword] = useState("");

  const [newChallengeName, setNewChallengeName] = useState("");
  const [newChallengePrompt, setNewChallengePrompt] = useState("");
  const [newChallengeFlag, setNewChallengeFlag] = useState("");
  const [newChallengePoints, setNewChallengePoints] = useState(500);
  const [newChallengeBrief, setNewChallengeBrief] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "logs" | "sessions"

  const showMessage = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  // كل طلب أدمن لازم يحمل هذا الهيدر. لو adminKey مفقود أو رفضه السيرفر
  // (403)، نعتبر الجلسة منتهية ونرجّع المستخدم لتسجيل الدخول بدل ما
  // نسيبه شايف بيانات فاضية بصمت.
  const adminFetch = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          ...(options.headers || {}),
          "X-Admin-Key": adminKey || "",
        },
      });
      if (res.status === 403 || res.status === 401) {
        setAuthError(true);
      }
      return res;
    },
    [adminKey]
  );

  const fetchData = useCallback(async () => {
    try {
      const [resTeams, resChallenges, resStats] = await Promise.all([
        adminFetch("/admin/teams"),
        adminFetch("/admin/challenges"),
        adminFetch("/admin/stats"),
      ]);

      if (resTeams.ok) setTeams(await resTeams.json());
      if (resChallenges.ok) setChallenges(await resChallenges.json());
      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats(statsData);
        if (typeof statsData?.overview?.is_active === "boolean") {
          setIsCompetitionActive(statsData.overview.is_active);
        }
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  }, [adminFetch]);

  useEffect(() => {
    if (!adminKey) {
      setAuthError(true);
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [adminKey, fetchData]);

  const toggleCompetition = async () => {
    if (!window.confirm(`هل أنت متأكد من ${isCompetitionActive ? "إيقاف" : "تشغيل"} المسابقة؟`)) return;
    try {
      const res = await adminFetch("/admin/toggle_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !isCompetitionActive }),
      });
      if (res.ok) {
        setIsCompetitionActive(!isCompetitionActive);
        showMessage(!isCompetitionActive ? "تم فتح المسابقة للفرق! 🟢" : "تم إيقاف المسابقة! 🔴");
      } else if (res.status !== 403) {
        showMessage("تعذر تنفيذ الطلب", "error");
      }
    } catch (err) {
      showMessage("خطأ في الاتصال", "error");
    }
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminFetch("/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newTeamName, password: newTeamPassword }),
      });
      if (res.ok) {
        showMessage("تم إضافة الفريق بنجاح!");
        setNewTeamName("");
        setNewTeamPassword("");
        fetchData();
      } else if (res.status !== 403) {
        const errorData = await res.json();
        showMessage(errorData.detail || "خطأ في الإضافة", "error");
      }
    } catch (err) {
      showMessage("خطأ في الاتصال", "error");
    }
    setLoading(false);
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm("حذف هذا الفريق سيؤدي لحذف كل محادثاته ونقاطه، متأكد؟")) return;
    try {
      const res = await adminFetch(`/admin/teams/${id}`, { method: "DELETE" });
      if (res.ok) {
        showMessage("تم الحذف بنجاح!");
        fetchData();
      }
    } catch (err) {
      showMessage("خطأ أثناء الحذف", "error");
    }
  };

  const handleAddChallenge = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminFetch("/admin/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChallengeName,
          system_prompt: newChallengePrompt,
          flag_text: newChallengeFlag,
          base_points: parseInt(newChallengePoints, 10),
          mission_brief: newChallengeBrief || null,
        }),
      });
      if (res.ok) {
        showMessage("تم الإضافة بنجاح!");
        setNewChallengeName("");
        setNewChallengePrompt("");
        setNewChallengeFlag("");
        setNewChallengeBrief("");
        fetchData();
      } else if (res.status !== 403) {
        showMessage("خطأ في الإضافة", "error");
      }
    } catch (err) {
      showMessage("خطأ في الاتصال", "error");
    }
    setLoading(false);
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm("حذف التحدي سيمسح حلوله السابقة! متأكد؟")) return;
    try {
      const res = await adminFetch(`/admin/challenges/${id}`, { method: "DELETE" });
      if (res.ok) {
        showMessage("تم الحذف بنجاح!");
        fetchData();
      }
    } catch (err) {
      showMessage("خطأ أثناء الحذف", "error");
    }
  };

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] p-8" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
        <div className="max-w-sm rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="mb-3 text-4xl">🔒</div>
          <h2 className="mb-2 text-lg font-bold text-gray-800">انتهت صلاحية جلسة الأدمن</h2>
          <p className="mb-6 text-sm text-gray-500">
            سجّل الدخول مرة أخرى بحساب الأدمن للمتابعة.
          </p>
          <button
            onClick={onExit}
            className="w-full rounded-lg bg-[#1E3A8A] py-2.5 text-sm font-bold text-white hover:bg-blue-800"
          >
            الرجوع لتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  const overview = stats.overview || {};

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-8" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="mx-auto max-w-6xl">

        {/* Header & Kill Switch */}
        <div className="mb-8 flex items-center justify-between rounded-xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A8A]">⚙️ لوحة تحكم المنظمين</h1>
            <p className="text-sm text-gray-500">إدارة الفرق والتحديات والتحكم المركزي</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={toggleCompetition}
              className={`rounded-lg px-6 py-2 font-bold text-white shadow transition-all ${isCompetitionActive ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-green-600 hover:bg-green-700"}`}
            >
              {isCompetitionActive ? "🔴 إيقاف المسابقة" : "🟢 بدء المسابقة"}
            </button>
            <button onClick={onExit} className="rounded-lg bg-gray-200 px-4 py-2 font-bold text-gray-700 hover:bg-gray-300">
              خروج
            </button>
          </div>
        </div>

        {msg.text && (
          <div className={`mb-6 rounded-lg p-4 font-bold text-white ${msg.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {[
            { id: "overview", label: "📋 نظرة عامة" },
            { id: "logs", label: "🛰️ المراقبة الحية" },
            { id: "sessions", label: "⚡ الجلسات النشطة" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#1E3A8A] text-[#1E3A8A]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "logs" && <AdminLogs adminKey={adminKey} />}
        {activeTab === "sessions" && <ActiveSessions adminKey={adminKey} />}

        {activeTab === "overview" && (
        <>
        {/* Overview cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          <OverviewCard label="الفرق المسجلة" value={overview.teams_count ?? 0} accent="#1E3A8A" />
          <OverviewCard label="التحديات" value={overview.challenges_count ?? 0} accent="#2563EB" />
          <OverviewCard label="جلسات نشطة الآن" value={overview.active_sessions_count ?? 0} accent="#16A34A" />
          <OverviewCard label="إجمالي المحاولات" value={overview.total_attempts ?? 0} accent="#D97706" />
          <OverviewCard
            label="نسبة الحظر الكلية"
            value={`${overview.overall_blocked_rate ?? 0}%`}
            accent="#DC2626"
          />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Leaderboard */}
          <div className="rounded-xl bg-white p-6 shadow-sm border-t-4 border-yellow-400">
            <h2 className="mb-4 text-xl font-bold text-gray-800">🏆 لوحة الصدارة</h2>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-right text-sm">
                <thead><tr className="border-b bg-gray-50 text-gray-600"><th className="p-2">المركز</th><th className="p-2">الفريق</th><th className="p-2">النقاط</th></tr></thead>
                <tbody>
                  {stats.leaderboard.map((team, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-bold text-gray-500">#{idx + 1}</td>
                      <td className="p-2 font-bold text-blue-600">{team.team}</td>
                      <td className="p-2 font-bold text-green-600">{team.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Challenge stats — now with attempts + blocked rate */}
          <div className="rounded-xl bg-white p-6 shadow-sm border-t-4 border-red-500">
            <h2 className="mb-4 text-xl font-bold text-gray-800">📊 إحصائيات التحديات</h2>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="p-2">التحدي</th>
                    <th className="p-2">الحلول</th>
                    <th className="p-2">أول فريق 🩸</th>
                    <th className="p-2">المحاولات</th>
                    <th className="p-2">نسبة الحظر</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.challenges.map((c, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-bold text-gray-800">{c.name}</td>
                      <td className="p-2 font-bold text-blue-600">{c.solves_count}</td>
                      <td className="p-2 font-bold text-red-600">{c.first_blood}</td>
                      <td className="p-2 text-gray-700">{c.attempts_count ?? 0}</td>
                      <td className="p-2 text-gray-700">{c.blocked_rate ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Teams Section */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-gray-800">👥 إدارة الفرق</h2>
            <form onSubmit={handleAddTeam} className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 grid grid-cols-2 gap-3">
                <input required value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="اسم الفريق" className="rounded border p-2 text-sm outline-none focus:border-blue-500" />
                <input required value={newTeamPassword} onChange={(e) => setNewTeamPassword(e.target.value)} placeholder="كلمة المرور" className="rounded border p-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <button disabled={loading} className="w-full rounded bg-[#1E3A8A] py-2 text-sm font-bold text-white hover:bg-blue-800">إضافة الفريق</button>
            </form>

            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="p-2">ID</th>
                    <th className="p-2">اسم الفريق</th>
                    <th className="p-2">النقاط</th>
                    <th className="p-2">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map(t => (
                    <tr key={t.team_id ?? t.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{t.team_id ?? t.id}</td>
                      <td className="p-2 font-bold text-blue-600">{t.team_name ?? t.username ?? "بدون اسم"}</td>
                      <td className="p-2 text-green-600">{t.total_score}</td>
                      <td className="p-2">
                        <button onClick={() => handleDeleteTeam(t.team_id ?? t.id)} className="text-red-500 hover:text-red-700 font-bold">🗑️ حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Challenges Section */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-gray-800">🎯 إدارة التحديات</h2>
            <form onSubmit={handleAddChallenge} className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 space-y-3">
                <input required value={newChallengeName} onChange={(e) => setNewChallengeName(e.target.value)} placeholder="اسم التحدي" className="w-full rounded border p-2 text-sm outline-none focus:border-blue-500" />
                <textarea value={newChallengeBrief} onChange={(e) => setNewChallengeBrief(e.target.value)} placeholder="نص المهمة اللي يظهر للاعب (القصة والهدف بدون كشف الحل)" className="h-16 w-full resize-none rounded border p-2 text-sm outline-none focus:border-blue-500" />
                <textarea required value={newChallengePrompt} onChange={(e) => setNewChallengePrompt(e.target.value)} placeholder="System Prompt" className="h-20 w-full resize-none rounded border p-2 text-sm outline-none focus:border-blue-500" />
                <div className="grid grid-cols-2 gap-3">
                  <input required value={newChallengeFlag} onChange={(e) => setNewChallengeFlag(e.target.value)} placeholder="FLAG{...}" className="rounded border p-2 text-sm outline-none focus:border-blue-500" />
                  <input required type="number" value={newChallengePoints} onChange={(e) => setNewChallengePoints(e.target.value)} placeholder="النقاط" className="rounded border p-2 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>
              <button disabled={loading} className="w-full rounded bg-[#16A34A] py-2 text-sm font-bold text-white hover:bg-green-700">إضافة التحدي</button>
            </form>

            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-right text-sm">
                <thead><tr className="border-b bg-gray-50 text-gray-600"><th className="p-2">ID</th><th className="p-2">الاسم</th><th className="p-2">النقاط</th><th className="p-2">إجراء</th></tr></thead>
                <tbody>
                  {challenges.map(c => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{c.id}</td>
                      <td className="p-2 font-bold">{c.name}</td>
                      <td className="p-2 text-blue-600">{c.base_points}</td>
                      <td className="p-2">
                        <button onClick={() => handleDeleteChallenge(c.id)} className="text-red-500 hover:text-red-700 font-bold">🗑️ حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

function OverviewCard({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border-t-4" style={{ borderTopColor: accent }}>
      <div className="text-xs font-bold text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color: accent }}>{value}</div>
    </div>
  );
}