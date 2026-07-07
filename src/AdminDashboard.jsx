import React, { useState, useEffect } from "react";

const API_BASE = "https://ox-vault-backend-2026-cb729bd57697.herokuapp.com";

export default function AdminDashboard({ onExit }) {
  const [teams, setTeams] = useState([]);
  const [challenges, setChallenges] = useState([]);
  
  // States for new Team
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamPassword, setNewTeamPassword] = useState("");

  // States for new Challenge
  const [newChallengeName, setNewChallengeName] = useState("");
  const [newChallengePrompt, setNewChallengePrompt] = useState("");
  const [newChallengeFlag, setNewChallengeFlag] = useState("");
  const [newChallengePoints, setNewChallengePoints] = useState(500);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const showMessage = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const fetchData = async () => {
    try {
      const resTeams = await fetch(`${API_BASE}/admin/teams`);
      const resChallenges = await fetch(`${API_BASE}/admin/challenges`);
      if (resTeams.ok) setTeams(await resTeams.json());
      if (resChallenges.ok) setChallenges(await resChallenges.json());
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddTeam = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newTeamName, password: newTeamPassword }),
      });
      if (res.ok) {
        showMessage("تم إضافة الفريق بنجاح!");
        setNewTeamName("");
        setNewTeamPassword("");
        fetchData();
      } else {
        const errorData = await res.json();
        showMessage(errorData.detail || "خطأ في الإضافة", "error");
      }
    } catch (err) {
      showMessage("خطأ في الاتصال بالخادم", "error");
    }
    setLoading(false);
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الفريق؟")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/teams/${id}`, { method: "DELETE" });
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
      const res = await fetch(`${API_BASE}/admin/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChallengeName,
          system_prompt: newChallengePrompt,
          flag_text: newChallengeFlag,
          base_points: parseInt(newChallengePoints),
        }),
      });
      if (res.ok) {
        showMessage("تم إضافة التحدي بنجاح!");
        setNewChallengeName("");
        setNewChallengePrompt("");
        setNewChallengeFlag("");
        fetchData();
      }
    } catch (err) {
      showMessage("خطأ في الاتصال بالخادم", "error");
    }
    setLoading(false);
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التحدي؟")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/challenges/${id}`, { method: "DELETE" });
      if (res.ok) {
        showMessage("تم الحذف بنجاح!");
        fetchData();
      }
    } catch (err) {
      showMessage("خطأ أثناء الحذف", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-8" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between rounded-xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A8A]">⚙️ لوحة تحكم المنظمين (Admin)</h1>
            <p className="text-sm text-gray-500">إدارة الفرق والتحديات بشكل مباشر</p>
          </div>
          <button onClick={onExit} className="rounded-lg bg-red-100 px-4 py-2 font-bold text-red-600 hover:bg-red-200">
            خروج من اللوحة
          </button>
        </div>

        {msg.text && (
          <div className={`mb-6 rounded-lg p-4 font-bold text-white ${msg.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Teams Section */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-gray-800">👥 إدارة الفرق</h2>
            
            <form onSubmit={handleAddTeam} className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-bold text-gray-600">إضافة فريق جديد</h3>
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
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{t.id}</td>
                      <td className="p-2 font-bold">{t.username}</td>
                      <td className="p-2 text-green-600">{t.total_score}</td>
                      <td className="p-2">
                        <button onClick={() => handleDeleteTeam(t.id)} className="text-red-500 hover:text-red-700">🗑️ حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Challenges Section */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-gray-800">🎯 إدارة التحديات (الخدمات)</h2>
            
            <form onSubmit={handleAddChallenge} className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-bold text-gray-600">إضافة تحدي جديد</h3>
              <div className="mb-3 space-y-3">
                <input required value={newChallengeName} onChange={(e) => setNewChallengeName(e.target.value)} placeholder="اسم التحدي (مثال: تسجيل المواد)" className="w-full rounded border p-2 text-sm outline-none focus:border-blue-500" />
                <textarea required value={newChallengePrompt} onChange={(e) => setNewChallengePrompt(e.target.value)} placeholder="System Prompt (تعليمات الذكاء الاصطناعي)" className="h-20 w-full resize-none rounded border p-2 text-sm outline-none focus:border-blue-500" />
                <div className="grid grid-cols-2 gap-3">
                  <input required value={newChallengeFlag} onChange={(e) => setNewChallengeFlag(e.target.value)} placeholder="صيغة العلم FLAG{...}" className="rounded border p-2 text-sm outline-none focus:border-blue-500" />
                  <input required type="number" value={newChallengePoints} onChange={(e) => setNewChallengePoints(e.target.value)} placeholder="النقاط (مثال: 500)" className="rounded border p-2 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>
              <button disabled={loading} className="w-full rounded bg-[#16A34A] py-2 text-sm font-bold text-white hover:bg-green-700">إضافة التحدي</button>
            </form>

            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="p-2">ID</th>
                    <th className="p-2">اسم التحدي</th>
                    <th className="p-2">النقاط</th>
                    <th className="p-2">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {challenges.map(c => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{c.id}</td>
                      <td className="p-2 font-bold">{c.name}</td>
                      <td className="p-2 text-blue-600">{c.base_points}</td>
                      <td className="p-2">
                        <button onClick={() => handleDeleteChallenge(c.id)} className="text-red-500 hover:text-red-700">🗑️ حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}