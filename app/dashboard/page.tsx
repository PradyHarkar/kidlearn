"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mascot } from "@/components/mascot/Mascot";
import { Child } from "@/types";
import toast from "react-hot-toast";

const AVATARS = ["🐼", "🦁", "🐸", "🦊", "🐧", "🦄", "🐻", "🐯"];
const YEAR_LEVELS = [
  { value: "prep", label: "Prep (Age 5-6)", emoji: "🌱" },
  { value: "year3", label: "Year 3 (Age 8-9)", emoji: "🎓" },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [form, setForm] = useState({ childName: "", yearLevel: "prep", avatar: "🐼" });
  const [adding, setAdding] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showSubjectSelect, setShowSubjectSelect] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchChildren();
  }, [status]);

  const fetchChildren = async () => {
    try {
      const res = await fetch("/api/children");
      const data = await res.json();
      setChildren(data.children || []);
    } catch {
      toast.error("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  };

  const addChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      setChildren([...children, data.child]);
      setShowAddChild(false);
      setForm({ childName: "", yearLevel: "prep", avatar: "🐼" });
      toast.success(`${data.child.childName}'s profile created! 🎉`);
    } catch {
      toast.error("Failed to add child");
    } finally {
      setAdding(false);
    }
  };

  const deleteChild = async (childId: string, childName: string) => {
    if (!confirm(`Remove ${childName}'s profile? This cannot be undone.`)) return;
    try {
      await fetch(`/api/children/${childId}`, { method: "DELETE" });
      setChildren(children.filter((c) => c.childId !== childId));
      toast.success("Profile removed");
    } catch {
      toast.error("Failed to remove profile");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
        <div className="text-center text-white">
          <div className="spinner mx-auto mb-4" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
          <p className="font-bold text-xl">Loading... ✨</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-card px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            🌟 KidLearn
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-600 font-semibold hidden sm:block">
            👋 Hi, {session?.user?.name}!
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-gray-500 hover:text-red-500 font-bold text-sm transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-6 text-white mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">Welcome back, {session?.user?.name}! 🎉</h1>
            <p className="text-white/80 font-semibold mt-1">
              Who's learning today? Select a child profile below!
            </p>
          </div>
          <div className="hidden sm:block">
            <Mascot mood="happy" size="sm" />
          </div>
        </motion.div>

        {/* Child Profiles */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-800 mb-4">👶 Child Profiles</h2>

          {children.length === 0 && !showAddChild && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-3xl p-10 text-center shadow-card"
            >
              <div className="text-6xl mb-4">👨‍👩‍👧</div>
              <h3 className="text-xl font-black text-gray-700 mb-2">No children yet!</h3>
              <p className="text-gray-500 mb-6 font-semibold">Add your first child profile to get started.</p>
              <button
                onClick={() => setShowAddChild(true)}
                className="btn-primary"
              >
                + Add Child Profile
              </button>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child, i) => (
              <motion.div
                key={child.childId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-3xl p-6 shadow-card hover:shadow-kid transition-all cursor-pointer group"
              >
                {/* Avatar and name */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center text-4xl">
                      {child.avatar}
                    </div>
                    <div>
                      <h3 className="font-black text-gray-800 text-lg">{child.childName}</h3>
                      <p className="text-gray-500 text-sm font-semibold">
                        {child.yearLevel === "prep" ? "🌱 Prep" : "🎓 Year 3"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChild(child.childId, child.childName);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all text-xl"
                    title="Remove profile"
                  >
                    ✕
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-yellow-50 rounded-xl p-2 text-center">
                    <p className="text-xl font-black text-yellow-600">🔥 {child.streakDays || 0}</p>
                    <p className="text-xs font-bold text-yellow-600">Streak</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2 text-center">
                    <p className="text-xl font-black text-blue-600">⭐ {child.totalStars || 0}</p>
                    <p className="text-xs font-bold text-blue-600">Stars</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-2 text-center">
                    <p className="text-xl font-black text-purple-600">🪙 {child.totalCoins || 0}</p>
                    <p className="text-xs font-bold text-purple-600">Coins</p>
                  </div>
                </div>

                {/* Difficulty levels */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-pink-600">🔢 Maths Level</span>
                    <span className="font-black text-pink-700">{child.currentDifficultyMaths || 1}/10</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500"
                      style={{ width: `${((child.currentDifficultyMaths || 1) / 10) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-cyan-600">📖 English Level</span>
                    <span className="font-black text-cyan-700">{child.currentDifficultyEnglish || 1}/10</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                      style={{ width: `${((child.currentDifficultyEnglish || 1) / 10) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-emerald-600">🔬 Science Level</span>
                    <span className="font-black text-emerald-700">{child.currentDifficultyScience || 1}/10</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                      style={{ width: `${((child.currentDifficultyScience || 1) / 10) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Start learning button */}
                <motion.button
                  onClick={() => {
                    setSelectedChild(child);
                    setShowSubjectSelect(true);
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full btn-primary text-center py-3"
                >
                  🚀 Start Learning!
                </motion.button>
              </motion.div>
            ))}

            {/* Add child button */}
            {children.length < 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowAddChild(true)}
                className="bg-white rounded-3xl p-6 shadow-card hover:shadow-kid transition-all cursor-pointer border-3 border-dashed border-purple-200 hover:border-purple-400 flex flex-col items-center justify-center min-h-48"
              >
                <div className="text-5xl mb-3">➕</div>
                <p className="font-black text-purple-600 text-lg">Add Child</p>
                <p className="text-gray-400 text-sm font-semibold mt-1">
                  {3 - children.length} slot{3 - children.length !== 1 ? "s" : ""} remaining
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Subject Selection Modal */}
      <AnimatePresence>
        {showSubjectSelect && selectedChild && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowSubjectSelect(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-4xl p-8 max-w-md w-full shadow-kid"
            >
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">{selectedChild.avatar}</div>
                <h2 className="text-2xl font-black text-gray-800">
                  What shall {selectedChild.childName} learn today?
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowSubjectSelect(false);
                    router.push(`/learn?child=${selectedChild.childId}&subject=maths`);
                  }}
                  className="maths-gradient rounded-3xl p-5 text-white text-center shadow-kid"
                >
                  <div className="text-4xl mb-2">🔢</div>
                  <p className="font-black text-lg">Maths</p>
                  <p className="text-white/80 text-xs font-semibold mt-1">
                    Lv {selectedChild.currentDifficultyMaths || 1}
                  </p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowSubjectSelect(false);
                    router.push(`/learn?child=${selectedChild.childId}&subject=english`);
                  }}
                  className="english-gradient rounded-3xl p-5 text-white text-center shadow-kid"
                >
                  <div className="text-4xl mb-2">📖</div>
                  <p className="font-black text-lg">English</p>
                  <p className="text-white/80 text-xs font-semibold mt-1">
                    Lv {selectedChild.currentDifficultyEnglish || 1}
                  </p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowSubjectSelect(false);
                    router.push(`/learn?child=${selectedChild.childId}&subject=science`);
                  }}
                  className="science-gradient rounded-3xl p-5 text-white text-center shadow-kid"
                >
                  <div className="text-4xl mb-2">🔬</div>
                  <p className="font-black text-lg">Science</p>
                  <p className="text-white/80 text-xs font-semibold mt-1">
                    Lv {selectedChild.currentDifficultyScience || 1}
                  </p>
                </motion.button>
              </div>

              <button
                onClick={() => setShowSubjectSelect(false)}
                className="w-full mt-4 text-gray-400 hover:text-gray-600 font-bold py-2 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Child Modal */}
      <AnimatePresence>
        {showAddChild && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddChild(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-4xl p-8 max-w-md w-full shadow-kid"
            >
              <h2 className="text-2xl font-black text-gray-800 mb-6 text-center">
                Add Child Profile 👶
              </h2>

              <form onSubmit={addChild} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1 ml-1">Child's Name</label>
                  <input
                    type="text"
                    value={form.childName}
                    onChange={(e) => setForm({ ...form, childName: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Emma"
                    required
                    maxLength={50}
                  />
                </div>

                {/* Year Level */}
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2 ml-1">Year Level</label>
                  <div className="grid grid-cols-2 gap-3">
                    {YEAR_LEVELS.map((level) => (
                      <motion.button
                        key={level.value}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setForm({ ...form, yearLevel: level.value })}
                        className={`p-3 rounded-2xl border-2 font-bold text-sm transition-all ${
                          form.yearLevel === level.value
                            ? "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-gray-200 text-gray-600 hover:border-purple-300"
                        }`}
                      >
                        {level.emoji} {level.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Avatar */}
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2 ml-1">Choose Avatar</label>
                  <div className="grid grid-cols-4 gap-2">
                    {AVATARS.map((avatar) => (
                      <motion.button
                        key={avatar}
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setForm({ ...form, avatar })}
                        className={`h-14 rounded-2xl text-3xl transition-all ${
                          form.avatar === avatar
                            ? "bg-purple-100 border-2 border-purple-500 scale-110"
                            : "bg-gray-50 border-2 border-transparent hover:bg-purple-50"
                        }`}
                      >
                        {avatar}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddChild(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    disabled={adding || !form.childName}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    {adding ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Add Profile 🎉"
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
