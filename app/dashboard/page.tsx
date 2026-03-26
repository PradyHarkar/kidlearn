"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mascot } from "@/components/mascot/Mascot";
import { Child, Subscription, SubscriptionStatus } from "@/types";
import { COUNTRY_CONFIGS } from "@/lib/curriculum";
import { getLearnerDisplayLabel } from "@/lib/learner";
import toast from "react-hot-toast";
import Link from "next/link";
import type { Country } from "@/types";

const AVATARS = ["🐼", "🦁", "🐸", "🦊", "🐧", "🦄", "🐻", "🐯"];

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
        <div className="text-white font-bold text-xl">Loading... ✨</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [form, setForm] = useState({ childName: "", grade: "", avatar: "🐼" });
  const [adding, setAdding] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showSubjectSelect, setShowSubjectSelect] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | undefined>();
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinChild, setPinChild] = useState<Child | null>(null);
  const [pinForm, setPinForm] = useState({ pin: "" });
  const [savingPin, setSavingPin] = useState(false);
  const [removingPin, setRemovingPin] = useState(false);

  // Determine the country-based grades for the child form
  const country = (session?.user?.country as Country) ?? "AU";
  const grades = COUNTRY_CONFIGS[country]?.grades ?? COUNTRY_CONFIGS.AU.grades;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchChildren();
      fetchSubscription();
    }
  }, [status]);

  useEffect(() => {
    // Set default grade when grades list is available and form grade is empty
    if (grades.length && !form.grade) {
      setForm((f) => ({ ...f, grade: grades[0].gradeId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grades]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast.success("Subscription activated! Welcome to KidLearn! 🎉");
      fetchSubscription();
    }
  }, [searchParams]);

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

  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/subscription/status");
      const data = await res.json();
      setSubscription(data.subscription ?? null);
      setSubscriptionStatus(data.subscriptionStatus);
      setTrialDaysRemaining(data.trialDaysRemaining ?? 0);
    } catch {
      // Non-critical
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
      setForm({ childName: "", grade: grades[0]?.gradeId ?? "", avatar: "🐼" });
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

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const res = await fetch("/api/subscription/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch {
      toast.error("Failed to open billing portal");
      setManagingSubscription(false);
    }
  };

  const gradeLabel = (child: Child) => {
    return `🎓 ${getLearnerDisplayLabel(child)}`;
  };

  const rewardBalance = (child: Child) => {
    return Math.max(0, (child.rewardPoints || 0) - (child.rewardPointsRedeemed || 0));
  };

  const openPinModal = (child: Child) => {
    setPinChild(child);
    setPinForm({ pin: "" });
    setShowPinModal(true);
  };

  const saveChildPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinChild) return;

    setSavingPin(true);
    try {
      const res = await fetch(`/api/children/${pinChild.childId}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pinForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save child PIN");
        return;
      }

      await fetchChildren();
      toast.success(`${pinChild.childName}'s PIN login is ready`);
      setShowPinModal(false);
      setPinChild(null);
      setPinForm({ pin: "" });
    } catch {
      toast.error("Failed to save child PIN");
    } finally {
      setSavingPin(false);
    }
  };

  const removeChildPin = async () => {
    if (!pinChild) return;

    setRemovingPin(true);
    try {
      const res = await fetch(`/api/children/${pinChild.childId}/pin`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to remove child PIN");
        return;
      }

      await fetchChildren();
      toast.success(`${pinChild.childName}'s PIN login was removed`);
      setShowPinModal(false);
      setPinChild(null);
      setPinForm({ pin: "" });
    } catch {
      toast.error("Failed to remove child PIN");
    } finally {
      setRemovingPin(false);
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

  // Subscription banner
  const renderSubscriptionBanner = () => {
    if (subscriptionStatus === "active") {
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-green-50 border-2 border-green-200 rounded-2xl px-5 py-3 flex items-center justify-between"
        >
          <p className="text-green-800 font-semibold text-sm">
            ✅ Active subscription
            {subscription?.currentPeriodEnd && (
              <span className="text-green-600 ml-2">
                · Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
          </p>
          <button
            onClick={handleManageSubscription}
            disabled={managingSubscription}
            className="text-green-700 font-bold text-sm underline hover:text-green-900 disabled:opacity-50"
          >
            {managingSubscription ? "Loading..." : "Manage"}
          </button>
        </motion.div>
      );
    }

    if (subscriptionStatus === "trial") {
      if (trialDaysRemaining > 0) {
        return (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-2xl px-5 py-3 flex items-center justify-between"
          >
            <p className="text-blue-800 font-semibold text-sm">
              🎁 Free trial · <strong>{trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""}</strong> remaining
            </p>
            <Link href="/pricing" className="text-blue-700 font-black text-sm underline hover:text-blue-900">
              Subscribe Now
            </Link>
          </motion.div>
        );
      }
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-3 flex items-center justify-between"
        >
          <p className="text-amber-800 font-semibold text-sm">
            ⚠️ Your free trial has ended. Subscribe to continue learning.
          </p>
          <Link href="/pricing" className="text-amber-800 font-black text-sm underline hover:text-amber-900">
            Subscribe →
          </Link>
        </motion.div>
      );
    }

    if (subscriptionStatus === "cancelled") {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 bg-gray-50 border-2 border-gray-200 rounded-2xl px-5 py-3 flex items-center justify-between"
        >
          <p className="text-gray-700 font-semibold text-sm">
            Subscription cancelled
            {subscription?.currentPeriodEnd && ` · Access until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
          </p>
          <Link href="/pricing" className="text-purple-600 font-black text-sm underline">
            Resubscribe
          </Link>
        </motion.div>
      );
    }

    if (subscriptionStatus === "past_due") {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 bg-red-50 border-2 border-red-300 rounded-2xl px-5 py-3 flex items-center justify-between"
        >
          <p className="text-red-700 font-semibold text-sm">⚠️ Payment failed. Please update your payment method.</p>
          <button
            onClick={handleManageSubscription}
            className="text-red-700 font-black text-sm underline hover:text-red-900"
          >
            Update Payment
          </button>
        </motion.div>
      );
    }

    return null;
  };

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
          <Link href="/rewards" className="text-gray-600 hover:text-purple-600 font-bold text-sm transition-colors">
            Rewards
          </Link>
          <Link href="/kids" className="text-gray-600 hover:text-purple-600 font-bold text-sm transition-colors hidden sm:inline">
            Kid PIN Login
          </Link>
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
          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-6 text-white mb-6 flex items-center justify-between"
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

        {/* Subscription Banner */}
        {renderSubscriptionBanner()}

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
              <button onClick={() => setShowAddChild(true)} className="btn-primary">
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
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center text-4xl">
                      {child.avatar}
                    </div>
                    <div>
                      <h3 className="font-black text-gray-800 text-lg">{child.childName}</h3>
                      <p className="text-gray-500 text-sm font-semibold">{gradeLabel(child)}</p>
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
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
                  <div className="bg-emerald-50 rounded-xl p-2 text-center">
                    <p className="text-xl font-black text-emerald-600">+ {rewardBalance(child)}</p>
                    <p className="text-xs font-bold text-emerald-600">Points</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {["maths", "english", "science"].map((subj) => {
                    const diffKey = `currentDifficulty${subj.charAt(0).toUpperCase() + subj.slice(1)}` as keyof Child;
                    const val = (child[diffKey] as number) || 1;
                    const colors: Record<string, string> = { maths: "from-pink-400 to-rose-500", english: "from-cyan-400 to-blue-500", science: "from-emerald-400 to-teal-500" };
                    const icons: Record<string, string> = { maths: "🔢", english: "📖", science: "🔬" };
                    return (
                      <div key={subj}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-gray-600 capitalize">{icons[subj]} {subj.charAt(0).toUpperCase() + subj.slice(1)}</span>
                          <span className="font-black text-gray-700">{val}/10</span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-2">
                          <div className={`h-full rounded-full bg-gradient-to-r ${colors[subj]}`} style={{ width: `${(val / 10) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <motion.button
                    onClick={() => { setSelectedChild(child); setShowSubjectSelect(true); }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full btn-primary text-center py-3"
                  >
                    🚀 Start Learning!
                  </motion.button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openPinModal(child)}
                      className="flex-1 btn-secondary text-sm py-2"
                    >
                      {child.hasChildPin ? "Update PIN" : "Set PIN"}
                    </button>
                    <button
                      onClick={() => router.push(`/kids?child=${child.childId}`)}
                      className="flex-1 btn-secondary text-sm py-2"
                    >
                      Kid Login
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-gray-500">
                    {child.hasChildPin
                      ? "PIN ready for kid login"
                      : "Add a PIN so this child can open their own learning screen"}
                  </p>
                </div>
              </motion.div>
            ))}

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
                {[
                  { subject: "maths", icon: "🔢", label: "Maths", diffKey: "currentDifficultyMaths", className: "maths-gradient" },
                  { subject: "english", icon: "📖", label: "English", diffKey: "currentDifficultyEnglish", className: "english-gradient" },
                  { subject: "science", icon: "🔬", label: "Science", diffKey: "currentDifficultyScience", className: "science-gradient" },
                ].map(({ subject, icon, label, diffKey, className }) => (
                  <motion.button
                    key={subject}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowSubjectSelect(false);
                      router.push(`/learn?child=${selectedChild.childId}&subject=${subject}`);
                    }}
                    className={`${className} rounded-3xl p-5 text-white text-center shadow-kid`}
                  >
                    <div className="text-4xl mb-2">{icon}</div>
                    <p className="font-black text-lg">{label}</p>
                    <p className="text-white/80 text-xs font-semibold mt-1">
                      Lv {(selectedChild[diffKey as keyof Child] as number) || 1}
                    </p>
                  </motion.button>
                ))}
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

      <AnimatePresence>
        {showPinModal && pinChild && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-4xl p-8 max-w-md w-full shadow-kid"
            >
              <h2 className="text-2xl font-black text-gray-800 mb-2 text-center">
                {pinChild.childName}&apos;s PIN Login
              </h2>
              <p className="text-sm font-semibold text-gray-500 text-center mb-6">
                A 4 to 6 digit PIN lets this child enter KidLearn directly. PIN is the active kid login path.
              </p>

              <form onSubmit={saveChildPin} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1 ml-1">Child PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4,6}"
                    value={pinForm.pin}
                    onChange={(e) => setPinForm((current) => ({ ...current, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                    className="input-field"
                    placeholder="4 to 6 digits"
                    minLength={4}
                    maxLength={6}
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPinModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  {pinChild.hasChildPin && (
                    <button
                      type="button"
                      onClick={removeChildPin}
                      disabled={removingPin}
                      className="btn-danger"
                    >
                      {removingPin ? "Removing..." : "Remove PIN"}
                    </button>
                  )}
                  <motion.button
                    type="submit"
                    disabled={savingPin || pinForm.pin.length < 4}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {savingPin ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Save PIN"
                    )}
                  </motion.button>
                </div>
              </form>
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

                {/* Grade selector — country-specific */}
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2 ml-1">
                    Grade / Year Level
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({COUNTRY_CONFIGS[country]?.name ?? "Australia"})
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {grades.map((grade) => (
                      <motion.button
                        key={grade.gradeId}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setForm({ ...form, grade: grade.gradeId })}
                        className={`p-3 rounded-2xl border-2 font-bold text-sm transition-all text-left ${
                          form.grade === grade.gradeId
                            ? "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-gray-200 text-gray-600 hover:border-purple-300"
                        }`}
                      >
                        <div>{grade.displayName}</div>
                        <div className="text-xs font-normal text-gray-400">{grade.curriculumName}</div>
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
                    disabled={adding || !form.childName || !form.grade}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
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

