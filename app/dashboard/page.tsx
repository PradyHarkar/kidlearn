"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mascot } from "@/components/mascot/Mascot";
import { Child, ProgressAlertSummary, ProgressSummary, Subscription, SubscriptionStatus, Subject, TopicPerformanceSummary, WeeklyDigestSummary } from "@/types";
import { COUNTRY_CONFIGS } from "@/lib/curriculum";
import { getLearnerDisplayLabel } from "@/lib/learner";
import { getDefaultTileThemeId, getTileThemeGroups, getTileThemePreset, TILE_THEME_PRESETS } from "@/lib/services/tile-themes";
import toast from "react-hot-toast";
import Link from "next/link";
import type { Country } from "@/types";
import { getTopicsForGrade } from "@/lib/curriculum";

const AVATARS = ["🐼", "🦁", "🐸", "🦊", "🐧", "🦄", "🐻", "🐯"];
type DashboardTab = "students" | "progress" | "rewards" | "account";

const DASHBOARD_TABS: Array<{ key: DashboardTab; label: string; emoji: string }> = [
  { key: "students", label: "Students", emoji: "👶" },
  { key: "progress", label: "Progress", emoji: "📈" },
  { key: "rewards", label: "Rewards", emoji: "🎁" },
  { key: "account", label: "Account", emoji: "👤" },
];

const TILE_FAVORITE_TAGS = [
  { id: "sports", label: "Sports", emoji: "🏀" },
  { id: "places", label: "Places", emoji: "🏰" },
  { id: "themes", label: "Themes", emoji: "🌈" },
  { id: "games", label: "Games", emoji: "🕹️" },
  { id: "rainbow", label: "Rainbow", emoji: "✨" },
  { id: "ocean", label: "Ocean", emoji: "🌊" },
  { id: "arcade", label: "Arcade", emoji: "🎮" },
  { id: "space", label: "Space", emoji: "🚀" },
];

const TOPIC_RING_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

function renderRingGradient<T extends { attempts: number }>(segments: T[]) {
  const total = segments.reduce((sum, segment) => sum + segment.attempts, 0);
  if (!total) {
    return "conic-gradient(#e5e7eb 0% 100%)";
  }

  let offset = 0;
  const stops = segments.map((segment, index) => {
    const start = offset;
    const width = (segment.attempts / total) * 100;
    offset += width;
    return `${TOPIC_RING_COLORS[index % TOPIC_RING_COLORS.length]} ${start}% ${offset}%`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

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
  const [showTopicsModal, setShowTopicsModal] = useState(false);
  const [topicsChild, setTopicsChild] = useState<Child | null>(null);
  const [topicPreferences, setTopicPreferences] = useState<string[]>([]);
  const [savingTopics, setSavingTopics] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [appearanceChild, setAppearanceChild] = useState<Child | null>(null);
  const [appearanceThemeId, setAppearanceThemeId] = useState("");
  const [appearanceFavoriteTags, setAppearanceFavoriteTags] = useState<string[]>([]);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [progressSummaries, setProgressSummaries] = useState<Record<string, ProgressSummary>>({});
  const [selectedProgressChildId, setSelectedProgressChildId] = useState("");
  const [topicSummary, setTopicSummary] = useState<TopicPerformanceSummary | null>(null);
  const [progressAlerts, setProgressAlerts] = useState<ProgressAlertSummary | null>(null);
  const [weeklyDigest, setWeeklyDigest] = useState<WeeklyDigestSummary | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Determine the country-based grades for the child form
  const country = (session?.user?.country as Country) ?? "AU";
  const grades = COUNTRY_CONFIGS[country]?.grades ?? COUNTRY_CONFIGS.AU.grades;
  const activeTab = (searchParams.get("tab") as DashboardTab) || "students";
  const activeAppearanceGroup = TILE_THEME_PRESETS.find((preset) => preset.id === appearanceThemeId)?.group;

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
    if (!children.length) {
      setSelectedProgressChildId("");
      setTopicSummary(null);
      setProgressAlerts(null);
      setWeeklyDigest(null);
      return;
    }

    if (!selectedProgressChildId || !children.some((child) => child.childId === selectedProgressChildId)) {
      setSelectedProgressChildId(children[0].childId);
    }
  }, [children, selectedProgressChildId]);

  useEffect(() => {
    if (!selectedProgressChildId) return;
    fetchProgressInsights(selectedProgressChildId);
  }, [selectedProgressChildId]);

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
      const nextChildren = data.children || [];
      setChildren(nextChildren);
      if (!selectedProgressChildId && nextChildren[0]) {
        setSelectedProgressChildId(nextChildren[0].childId);
      }

      const summaries = await Promise.all(
        nextChildren.map(async (child: Child) => {
          try {
            const summaryRes = await fetch(`/api/progress/summary?childId=${child.childId}`);
            const summaryData = await summaryRes.json();
            if (!summaryRes.ok) return null;
            return { childId: child.childId, summary: summaryData.summary as ProgressSummary };
          } catch {
            return null;
          }
        })
      );

      const summaryMap = summaries.reduce((acc, item) => {
        if (item) {
          acc[item.childId] = item.summary;
        }
        return acc;
      }, {} as Record<string, ProgressSummary>);
      setProgressSummaries(summaryMap);
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

  const fetchProgressInsights = async (childId: string) => {
    try {
      setInsightsLoading(true);
      const [topicsRes, alertsRes, digestRes] = await Promise.all([
        fetch(`/api/progress/topics?childId=${childId}`),
        fetch(`/api/progress/alerts?childId=${childId}`),
        fetch(`/api/reports/weekly?childId=${childId}`),
      ]);

      const [topicsData, alertsData, digestData] = await Promise.all([
        topicsRes.json(),
        alertsRes.json(),
        digestRes.json(),
      ]);

      setTopicSummary(topicsRes.ok ? topicsData.summary ?? null : null);
      setProgressAlerts(alertsRes.ok ? alertsData.summary ?? null : null);
      setWeeklyDigest(digestRes.ok ? digestData.digest ?? null : null);
    } catch {
      setTopicSummary(null);
      setProgressAlerts(null);
      setWeeklyDigest(null);
    } finally {
      setInsightsLoading(false);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
      setManagingSubscription(false);
    }
  };

  const gradeLabel = (child: Child) => {
    return `🎓 ${getLearnerDisplayLabel(child)}`;
  };

  const setTab = (tab: DashboardTab) => {
    router.push(`/dashboard?tab=${tab}`);
  };

  const rewardBalance = (child: Child) => {
    return Math.max(0, (child.rewardPoints || 0) - (child.rewardPointsRedeemed || 0));
  };

  const topicOptionsForChild = (child: Child) => {
    const ageGroup = (child.ageGroup || (child.yearLevel === "prep" ? "foundation" : child.yearLevel)) as Parameters<typeof getTopicsForGrade>[0];
    return Array.from(
      new Set(
        (["maths", "english", "science"] as const).flatMap((subject) =>
          getTopicsForGrade(ageGroup, subject, country).slice(0, 8)
        )
      )
    );
  };

  const childTileTheme = (child: Child) => getTileThemePreset(child.tileThemeId || getDefaultTileThemeId(child), child);

  const openAppearanceModal = (child: Child) => {
    setAppearanceChild(child);
    setAppearanceThemeId(child.tileThemeId || getDefaultTileThemeId(child));
    setAppearanceFavoriteTags(child.tileFavoriteTags || []);
    setShowAppearanceModal(true);
  };

  const toggleFavoriteTag = (tag: string) => {
    setAppearanceFavoriteTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
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

  const openTopicsModal = (child: Child) => {
    setTopicsChild(child);
    setTopicPreferences(child.topicPreferences || []);
    setShowTopicsModal(true);
  };

  const toggleTopicPreference = (topic: string) => {
    setTopicPreferences((current) =>
      current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic]
    );
  };

  const saveTopicPreferences = async () => {
    if (!topicsChild) return;

    setSavingTopics(true);
    try {
      const res = await fetch(`/api/children/${topicsChild.childId}/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicPreferences }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save topic preferences");
        return;
      }

      await fetchChildren();
      toast.success(`${topicsChild.childName}'s interests were saved`);
      setShowTopicsModal(false);
      setTopicsChild(null);
    } catch {
      toast.error("Failed to save topic preferences");
    } finally {
      setSavingTopics(false);
    }
  };

  const saveAppearance = async () => {
    if (!appearanceChild) return;

    setSavingAppearance(true);
    try {
      const res = await fetch(`/api/children/${appearanceChild.childId}/appearance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tileThemeId: appearanceThemeId,
          tileFavoriteTags: appearanceFavoriteTags,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save tile appearance");
        return;
      }

      await fetchChildren();
      toast.success(`${appearanceChild.childName}'s tile look was updated`);
      setShowAppearanceModal(false);
      setAppearanceChild(null);
    } catch {
      toast.error("Failed to save tile appearance");
    } finally {
      setSavingAppearance(false);
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

  const renderStudentsTab = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-2xl font-black text-gray-800">👶 Child Profiles</h2>
        <button onClick={() => setShowAddChild(true)} className="btn-primary hidden sm:inline-flex">
          + Add Child Profile
        </button>
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {children.map((child, i) => {
          const theme = childTileTheme(child);
          const accentClass = `bg-gradient-to-r ${theme.accentFrom} ${theme.accentTo}`;
          const favoriteTags = (child.tileFavoriteTags || []).slice(0, 3);

          return (
            <motion.div
              key={child.childId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`relative overflow-hidden rounded-3xl p-5 md:p-6 shadow-card hover:shadow-kid transition-all cursor-pointer group border border-white/80 bg-gradient-to-br ${theme.surface}`}
            >
              <div className="absolute inset-0 bg-white/15 backdrop-blur-2xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-md ${accentClass}`}>
                      <span className="drop-shadow-sm">{child.avatar}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-gray-900 text-lg leading-tight truncate">{child.childName}</h3>
                      <p className="text-gray-600 text-sm font-semibold truncate">{gradeLabel(child)}</p>
                      <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${theme.text} mt-1`}>
                        {theme.emoji} {theme.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAppearanceModal(child);
                      }}
                      className={`rounded-full px-3 py-1 text-[11px] font-black text-white shadow-md ${accentClass}`}
                      title="Customize tile appearance"
                    >
                      Customize tile
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChild(child.childId, child.childName);
                      }}
                      className="text-red-400 hover:text-red-600 transition-all text-xl opacity-80 hover:opacity-100"
                      title="Remove profile"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-4">
                  {child.diagnosticComplete ? (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700">
                      ✅ Diagnostic complete
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/diagnostic?childId=${child.childId}`);
                      }}
                      className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                      title="Start diagnostic"
                    >
                      🧪 Diagnostic pending
                    </button>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-white/75 text-gray-700">
                    {favoriteTags.length ? `Favorites: ${favoriteTags.join(", ")}` : "No favourites saved"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-white/75 backdrop-blur rounded-2xl p-3 text-center border border-white/70">
                    <p className="text-xl font-black text-yellow-700">🔥 {child.streakDays || 0}</p>
                    <p className="text-xs font-bold text-yellow-700">Streak</p>
                  </div>
                  <div className="bg-white/75 backdrop-blur rounded-2xl p-3 text-center border border-white/70">
                    <p className="text-xl font-black text-emerald-700">+ {rewardBalance(child)}</p>
                    <p className="text-xs font-bold text-emerald-700">Points</p>
                  </div>
                  <div className="bg-white/75 backdrop-blur rounded-2xl p-3 text-center border border-white/70">
                    <p className="text-xl font-black text-blue-700">⭐ {child.totalStars || 0}</p>
                    <p className="text-xs font-bold text-blue-700">Stars</p>
                  </div>
                  <div className="bg-white/75 backdrop-blur rounded-2xl p-3 text-center border border-white/70">
                    <p className="text-xl font-black text-purple-700">🪙 {child.totalCoins || 0}</p>
                    <p className="text-xs font-bold text-purple-700">Coins</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {(["maths", "english", "science"] as const).map((subj) => {
                    const diffKey = `currentDifficulty${subj.charAt(0).toUpperCase() + subj.slice(1)}` as keyof Child;
                    const attKey = `${subj}Attempted` as keyof typeof child.stats;
                    const attempted = (child.stats?.[attKey] as number) || 0;
                    const val = (child[diffKey] as number) || 1;
                    const notStarted = attempted === 0;
                    const colors: Record<string, string> = { maths: "from-pink-400 to-rose-500", english: "from-cyan-400 to-blue-500", science: "from-emerald-400 to-teal-500" };
                    const icons: Record<string, string> = { maths: "🔢", english: "📖", science: "🔬" };
                    return (
                      <div key={subj} className="bg-white/60 rounded-2xl p-2.5 border border-white/60">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-gray-600 capitalize">{icons[subj]} {subj.charAt(0).toUpperCase() + subj.slice(1)}</span>
                          <span className={`font-black ${notStarted ? "text-gray-400" : "text-gray-700"}`}>
                            {notStarted ? "Not started" : `Lv ${val}`}
                          </span>
                        </div>
                        <div className="bg-gray-100/90 rounded-full h-2">
                          <div className={`h-full rounded-full bg-gradient-to-r ${colors[subj]}`} style={{ width: notStarted ? "0%" : `${(val / 10) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <motion.button
                      onClick={() => { setSelectedChild(child); setShowSubjectSelect(true); }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full btn-primary text-center py-3"
                    >
                      🚀 Start Learning!
                    </motion.button>
                    <motion.button
                      onClick={() => openAppearanceModal(child)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full btn-secondary text-sm py-2.5"
                    >
                      ✨ Tile style
                    </motion.button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openPinModal(child)}
                      className="btn-secondary text-sm py-2"
                    >
                      {child.hasChildPin ? "Update PIN" : "Set PIN"}
                    </button>
                    <button
                      onClick={() => router.push(`/kids?child=${child.childId}`)}
                      className="btn-secondary text-sm py-2"
                    >
                      Kid Login
                    </button>
                  </div>
                  <button
                    onClick={() => openTopicsModal(child)}
                    className="w-full btn-secondary text-sm py-2"
                  >
                    Interests {child.topicPreferences?.length ? `(${child.topicPreferences.length})` : "Set topics"}
                  </button>
                  <p className="text-xs font-semibold text-gray-600">
                    {child.hasChildPin
                      ? "PIN ready for kid login"
                      : "Add a PIN so this child can open their own learning screen"}
                  </p>
                  {child.topicPreferences?.length ? (
                    <p className="text-xs font-semibold text-purple-700">
                      Prefers: {child.topicPreferences.slice(0, 3).join(", ")}
                      {child.topicPreferences.length > 3 ? "..." : ""}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-gray-500">No topic preferences saved yet</p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

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
  );

  const renderProgressTab = () => {
    const selectedProgressChild = selectedProgressChildId
      ? children.find((child) => child.childId === selectedProgressChildId) || null
      : null;
    const selectedSummary = selectedProgressChild ? progressSummaries[selectedProgressChild.childId] : null;

    return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-gray-800">📈 Progress</h2>
        <span className="text-sm font-bold text-gray-500">Topic charts, alerts, and weekly digest</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <p className="text-sm font-bold text-gray-500">Total Children</p>
          <p className="text-3xl font-black text-gray-800">{children.length}</p>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <p className="text-sm font-bold text-gray-500">Active PIN logins</p>
          <p className="text-3xl font-black text-gray-800">{children.filter((child) => child.hasChildPin).length}</p>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <p className="text-sm font-bold text-gray-500">Diagnostic complete</p>
          <p className="text-3xl font-black text-gray-800">{children.filter((child) => child.diagnosticComplete).length}</p>
        </div>
      </div>
      {children.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {children.map((child) => {
            const selected = child.childId === selectedProgressChildId;
            return (
              <button
                key={child.childId}
                onClick={() => setSelectedProgressChildId(child.childId)}
                className={`rounded-full px-4 py-2 text-sm font-black transition-all border-2 ${
                  selected
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                }`}
              >
                {child.avatar} {child.childName}
              </button>
            );
          })}
        </div>
      )}

      {selectedProgressChild ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-card">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-500">Focused child</p>
                  <h3 className="text-2xl font-black text-gray-800">{selectedProgressChild.childName}</h3>
                  <p className="text-sm text-gray-500 font-semibold">{gradeLabel(selectedProgressChild)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary text-sm"
                    onClick={() => router.push(`/learn?child=${selectedProgressChild.childId}&subject=maths`)}
                  >
                    Practice maths
                  </button>
                  <button
                    className="btn-primary text-sm"
                    onClick={() => router.push(`/learn?child=${selectedProgressChild.childId}`)}
                  >
                    Open learn
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Streak</p>
                  <p className="text-2xl font-black text-slate-800">🔥 {selectedProgressChild.streakDays || 0}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Points</p>
                  <p className="text-2xl font-black text-slate-800">+{rewardBalance(selectedProgressChild)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Sessions</p>
                  <p className="text-2xl font-black text-slate-800">{selectedSummary?.totalSessions ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500">Weekly accuracy</p>
                  <p className="text-2xl font-black text-slate-800">{weeklyDigest?.accuracy ?? 0}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-card">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-bold text-gray-500">Subject performance pie chart</p>
                  <h3 className="text-xl font-black text-gray-800">Topic-level strengths and weaknesses</h3>
                </div>
                <span className="text-xs font-black text-purple-600 uppercase tracking-[0.18em]">
                  {topicSummary ? "Live topic data" : "Loading insights"}
                </span>
              </div>

              {insightsLoading && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-gray-500">
                  Loading topic insights...
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(["maths", "english", "science"] as Subject[]).map((subject) => {
                  const subjectSummary = topicSummary?.subjects?.[subject];
                  const topics = subjectSummary?.topics || [];
                  const ringTopics = topics.slice(0, 5);
                  return (
                    <div key={subject} className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{subject}</p>
                          <p className="text-2xl font-black text-gray-800">{subjectSummary?.accuracy ?? 0}%</p>
                        </div>
                        <div
                          className="h-20 w-20 rounded-full p-2"
                          style={{ background: renderRingGradient(ringTopics) }}
                        >
                          <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-center">
                            <div>
                              <p className="text-sm font-black text-gray-800">{subjectSummary?.attempts ?? 0}</p>
                              <p className="text-[10px] font-bold text-gray-400">attempts</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        {topics.length ? topics.slice(0, 4).map((topic) => (
                          <div key={`${subject}-${topic.topic}`} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm">
                            <span className="font-bold text-gray-700 truncate pr-3">{topic.topic}</span>
                            <span className="font-black text-gray-900">{topic.accuracy}%</span>
                          </div>
                        )) : (
                          <p className="text-sm font-semibold text-gray-500">No topic attempts yet for this subject.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-card">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-500">Needs help smart alert</p>
                  <h3 className="text-xl font-black text-gray-800">Watch these topics</h3>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                  {progressAlerts?.alerts.length ?? 0} alerts
                </span>
              </div>
              {progressAlerts?.alerts.length ? (
                <div className="space-y-3">
                  {progressAlerts.alerts.map((alert) => (
                    <div key={`${alert.subject}-${alert.topic}`} className={`rounded-2xl border p-3 ${alert.severity === "danger" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{alert.subject}</p>
                          <p className="font-black text-gray-900">{alert.topic}</p>
                          <p className="text-sm font-semibold text-gray-600 mt-1">{alert.message}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-black ${alert.severity === "danger" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {alert.accuracy}%
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          className="btn-primary text-sm py-2 px-3"
                          onClick={() => router.push(alert.actionUrl)}
                        >
                          {alert.actionLabel}
                        </button>
                        <span className="text-xs font-semibold text-gray-500">
                          Use the report flag if the question itself is wrong.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  No smart alerts right now. The current pattern looks healthy.
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-card">
              <p className="text-sm font-bold text-gray-500">Weekly in-app digest</p>
              <h3 className="text-xl font-black text-gray-800">This week at a glance</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-indigo-50 p-3">
                  <p className="text-xs font-bold text-indigo-600">Questions</p>
                  <p className="text-2xl font-black text-indigo-700">{weeklyDigest?.totalQuestions ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3">
                  <p className="text-xs font-bold text-emerald-600">Accuracy</p>
                  <p className="text-2xl font-black text-emerald-700">{weeklyDigest?.accuracy ?? 0}%</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3">
                  <p className="text-xs font-bold text-amber-600">Points</p>
                  <p className="text-2xl font-black text-amber-700">{weeklyDigest?.rewardPointsEarned ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-3">
                  <p className="text-xs font-bold text-sky-600">Streak</p>
                  <p className="text-2xl font-black text-sky-700">{weeklyDigest?.streakDays ?? 0}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Top topics</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(weeklyDigest?.topTopics ?? []).slice(0, 6).map((topic) => (
                    <span key={`${topic.subject}-${topic.topic}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {topic.topic} · {topic.accuracy}%
                    </span>
                  ))}
                  {!weeklyDigest?.topTopics?.length && (
                    <span className="text-sm font-semibold text-gray-500">No weekly topics yet.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-card">
              <p className="text-sm font-bold text-gray-500">Recent sessions</p>
              <div className="mt-3 space-y-2">
                {(weeklyDigest?.recentSessions ?? []).slice(0, 4).map((session) => (
                  <div key={session.sessionId} className="rounded-2xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-gray-800 capitalize">{session.subject}</span>
                      <span className="text-sm font-bold text-gray-600">{session.accuracy}%</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-500 mt-1">
                      {session.totalQuestions} questions · {session.topic}
                    </p>
                  </div>
                ))}
                {!weeklyDigest?.recentSessions?.length && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-gray-500">
                    Recent sessions will appear here after the first 20-question set.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-6 shadow-card text-sm font-semibold text-gray-500">
          Add a child profile to unlock progress charts, smart alerts, and weekly digests.
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="py-2 pr-3">Child</th>
                <th className="py-2 pr-3">Maths</th>
                <th className="py-2 pr-3">English</th>
                <th className="py-2 pr-3">Science</th>
                <th className="py-2 pr-3">Last Subject</th>
              </tr>
            </thead>
            <tbody>
              {children.map((child) => (
                <tr key={child.childId} className="border-t border-gray-100">
                  <td className="py-3 pr-3 font-bold text-gray-800">{child.childName}</td>
                  <td className="py-3 pr-3">{(child.stats?.mathsAttempted || 0) > 0 ? `Lv ${child.currentDifficultyMaths || 1}` : "—"}</td>
                  <td className="py-3 pr-3">{(child.stats?.englishAttempted || 0) > 0 ? `Lv ${child.currentDifficultyEnglish || 1}` : "—"}</td>
                  <td className="py-3 pr-3">{(child.stats?.scienceAttempted || 0) > 0 ? `Lv ${child.currentDifficultyScience || 1}` : "—"}</td>
                  <td className="py-3 pr-3">{child.lastSubject || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    );
  };

  const renderRewardsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-gray-800">🎁 Rewards</h2>
        <Link href="/rewards" className="btn-primary text-sm">
          Open Rewards Center
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children.map((child) => (
          <div key={child.childId} className="bg-white rounded-3xl p-5 shadow-card">
            <p className="font-black text-gray-800 text-lg">{child.childName}</p>
            <p className="text-gray-500 text-sm font-semibold">{gradeLabel(child)}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded-2xl p-3">
                <p className="text-xs font-bold text-emerald-600">Available points</p>
                <p className="text-2xl font-black text-emerald-700">{rewardBalance(child)}</p>
              </div>
              <div className="bg-indigo-50 rounded-2xl p-3">
                <p className="text-xs font-bold text-indigo-600">Redeemed</p>
                <p className="text-2xl font-black text-indigo-700">{child.rewardPointsRedeemed || 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-3xl p-6 shadow-card">
        <p className="font-bold text-gray-700">
          Every 20-question set earns 20 points. Use the Rewards center to redeem gift cards or combine sibling points when needed.
        </p>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      {renderSubscriptionBanner()}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <p className="text-sm font-bold text-gray-500">Parent</p>
          <p className="text-2xl font-black text-gray-800">{session?.user?.name}</p>
          <p className="text-sm text-gray-500 mt-1">{session?.user?.email}</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <p className="text-sm font-bold text-gray-500">Country</p>
          <p className="text-2xl font-black text-gray-800">{country}</p>
          <p className="text-sm text-gray-500 mt-1">Dashboard content is matched to this profile.</p>
        </div>
      </div>
      <div className="bg-white rounded-3xl p-6 shadow-card flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-gray-800">Account actions</p>
          <p className="text-sm text-gray-500">Manage subscription, PINs, and sign out from here.</p>
        </div>
        <div className="flex gap-3">
          {(subscriptionStatus === "trial" || !subscriptionStatus) && (
            <Link href="/pricing" className="btn-primary">
              Subscribe Now
            </Link>
          )}
          {(subscriptionStatus === "active" || subscriptionStatus === "past_due" || subscriptionStatus === "cancelled") && (
            <button onClick={handleManageSubscription} disabled={managingSubscription} className="btn-secondary">
              {managingSubscription ? "Loading..." : "Manage Subscription"}
            </button>
          )}
          <button onClick={() => signOut({ callbackUrl: `${window.location.origin}/` })} className="btn-danger">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-card px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
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
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/` })}
            className="text-gray-500 hover:text-red-500 font-bold text-sm transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-5 sm:p-6 text-white mb-5 sm:mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
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

        <div className="mb-6 flex flex-wrap gap-2">
          {DASHBOARD_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`px-4 py-2 rounded-full font-black text-sm transition-all border-2 ${
                activeTab === tab.key
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
              }`}
            >
              <span className="mr-2">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "students" && renderStudentsTab()}
        {activeTab === "progress" && renderProgressTab()}
        {activeTab === "rewards" && renderRewardsTab()}
        {activeTab === "account" && renderAccountTab()}
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

      <AnimatePresence>
        {showTopicsModal && topicsChild && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowTopicsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-4xl p-8 max-w-2xl w-full shadow-kid"
            >
              <h2 className="text-2xl font-black text-gray-800 mb-2 text-center">
                {topicsChild.childName}&apos;s interests
              </h2>
              <p className="text-sm font-semibold text-gray-500 text-center mb-6">
                Pick topics this child likes. Questions will lean toward these topics when available.
              </p>

              <div className="max-h-96 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {topicOptionsForChild(topicsChild).map((topic) => {
                    const selected = topicPreferences.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopicPreference(topic)}
                        className={`rounded-2xl border-2 px-3 py-2 text-left font-bold text-sm transition-all ${
                          selected
                            ? "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-gray-200 text-gray-600 hover:border-purple-300"
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowTopicsModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTopicPreferences}
                  disabled={savingTopics}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {savingTopics ? "Saving..." : "Save Interests"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAppearanceModal && appearanceChild && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAppearanceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-4xl p-8 max-w-4xl w-full shadow-kid"
            >
              <h2 className="text-2xl font-black text-gray-800 mb-2 text-center">
                {appearanceChild.childName}&apos;s tile style
              </h2>
              <p className="text-sm font-semibold text-gray-500 text-center mb-6">
                Pick a theme for this child&apos;s dashboard tile and save their favourite vibes for a more personal look.
              </p>

              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {getTileThemeGroups().map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => {
                      const firstPreset = TILE_THEME_PRESETS.find((preset) => preset.group === group);
                      if (firstPreset) {
                        setAppearanceThemeId(firstPreset.id);
                      }
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-black capitalize transition-all ${
                      activeAppearanceGroup === group
                        ? "bg-purple-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {group}
                  </button>
                ))}
              </div>

              <div className="max-h-[32rem] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {TILE_THEME_PRESETS.map((preset) => {
                    const selected = appearanceThemeId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAppearanceThemeId(preset.id)}
                        className={`text-left rounded-3xl border-2 p-4 transition-all ${
                          selected
                            ? "border-purple-500 ring-2 ring-purple-200"
                            : "border-slate-100 hover:border-purple-200"
                        } bg-gradient-to-br ${preset.surface}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-xs font-black uppercase tracking-[0.18em] ${preset.text}`}>
                              {preset.group}
                            </p>
                            <h3 className="text-lg font-black text-slate-900 mt-1">
                              {preset.emoji} {preset.label}
                            </h3>
                            <p className="text-sm font-semibold text-slate-700 mt-1">{preset.subtitle}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-black text-white ${preset.accentFrom} ${preset.accentTo}`}>
                            {selected ? "Selected" : "Pick me"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-black text-gray-700 mb-3 text-center">Favourite tags</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {TILE_FAVORITE_TAGS.map((tag) => {
                    const selected = appearanceFavoriteTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleFavoriteTag(tag.id)}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                          selected
                            ? "bg-purple-600 text-white shadow-md"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {tag.emoji} {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAppearanceModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAppearance}
                  disabled={savingAppearance}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {savingAppearance ? "Saving..." : "Save Tile Style"}
                </button>
              </div>
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

