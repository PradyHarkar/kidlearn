"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Mascot } from "@/components/mascot/Mascot";
import type { Child, KidLoginMethod, Subject, YearLevel } from "@/types";

interface KidAccessChild {
  childId: string;
  childName: string;
  avatar?: string;
  grade?: string;
  yearLevel: YearLevel;
  allowedKidLoginMethods: KidLoginMethod[];
  rewardPoints?: number;
  rewardPointsRedeemed?: number;
  lastSubject?: Subject;
  lastSessionCompletedAt?: string;
}

interface KidSessionPayload extends KidAccessChild {
  userId: string;
}

function KidsContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("child");
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [previewChild, setPreviewChild] = useState<KidAccessChild | null>(null);
  const [kidSession, setKidSession] = useState<KidSessionPayload | null>(null);
  const [familyChildren, setFamilyChildren] = useState<Child[]>([]);

  useEffect(() => {
    void loadState();
  }, [childId, status]);

  const loadState = async () => {
    setLoading(true);
    try {
      const [kidSessionRes, previewRes, childrenRes] = await Promise.all([
        fetch("/api/kids/session"),
        childId ? fetch(`/api/kids/profile?childId=${encodeURIComponent(childId)}`) : Promise.resolve(null),
        status === "authenticated" && !childId ? fetch("/api/children") : Promise.resolve(null),
      ]);

      const kidSessionData = kidSessionRes ? await kidSessionRes.json() : { kidSession: null };
      setKidSession(kidSessionData.kidSession || null);

      if (previewRes) {
        const previewData = await previewRes.json();
        if (previewRes.ok) {
          setPreviewChild(previewData.child);
        } else {
          setPreviewChild(null);
        }
      } else {
        setPreviewChild(null);
      }

      if (childrenRes) {
        const childrenData = await childrenRes.json();
        if (childrenRes.ok) {
          setFamilyChildren((childrenData.children || []).filter((child: Child) => !!child.hasChildPin));
        } else {
          setFamilyChildren([]);
        }
      } else {
        setFamilyChildren([]);
      }
    } catch {
      toast.error("Failed to load child access");
    } finally {
      setLoading(false);
    }
  };

  const activeChild = kidSession && (!childId || kidSession.childId === childId) ? kidSession : previewChild;
  const rewardBalance = activeChild
    ? Math.max(0, (activeChild.rewardPoints || 0) - (activeChild.rewardPointsRedeemed || 0))
    : 0;

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChild?.childId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/kids/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: activeChild.childId,
          pin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log in child");
      }

      setKidSession(data.child);
      setPreviewChild(data.child);
      setPin("");
      toast.success(`${data.child.childName} is ready to learn`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to log in child";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKidLogout = async () => {
    await fetch("/api/kids/session", { method: "DELETE" });
    setKidSession(null);
    setPin("");
    if (!childId) {
      await loadState();
    }
  };

  const openSubject = (subject: Subject) => {
    if (!activeChild?.childId) return;
    router.push(`/learn?child=${activeChild.childId}&subject=${subject}`);
  };

  const renderSubjectButton = (subject: Subject, label: string, className: string) => (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => openSubject(subject)}
      className={`${className} rounded-3xl p-5 text-white shadow-kid text-left`}
    >
      <p className="text-sm font-black uppercase tracking-[0.2em] text-white/75">20 question set</p>
      <p className="text-2xl font-black mt-3">{label}</p>
      <p className="text-sm font-semibold text-white/80 mt-2">Earn 20 points when you finish.</p>
    </motion.button>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600">
        <div className="text-center text-white">
          <div className="spinner mx-auto mb-4" />
          <p className="font-black text-xl">Opening Kid PIN Login...</p>
        </div>
      </div>
    );
  }

  if (!childId && !kidSession && familyChildren.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm font-black text-cyan-600 uppercase tracking-[0.2em]">Kid Access</p>
              <h1 className="text-3xl font-black text-slate-800">Choose a child PIN profile</h1>
            </div>
            <Link href="/dashboard" className="btn-secondary text-sm py-2 px-4">Back</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {familyChildren.map((child) => (
              <button
                key={child.childId}
                onClick={() => router.push(`/kids?child=${child.childId}`)}
                className="bg-white rounded-4xl shadow-card p-6 text-left hover:shadow-kid transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-cyan-50 flex items-center justify-center text-4xl">
                    {child.avatar}
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-800">{child.childName}</p>
                    <p className="text-sm font-semibold text-slate-500">PIN enabled</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center px-4">
        <div className="bg-white rounded-4xl shadow-kid p-8 max-w-md text-center">
          <Mascot mood="thinking" size="md" />
          <h1 className="text-3xl font-black text-slate-800 mt-4">Kid PIN Login</h1>
          <p className="text-sm font-semibold text-slate-500 mt-3">
            Ask your parent to open your child access link from the dashboard, or set up your PIN first.
          </p>
          <div className="flex gap-3 mt-6 justify-center">
            <Link href="/" className="btn-secondary text-sm py-2 px-4">Home</Link>
            <Link href="/login" className="btn-primary text-sm py-2 px-4">Parent Login</Link>
          </div>
        </div>
      </div>
    );
  }

  if (kidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div className="text-white">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-white/70">Kid Mode</p>
              <h1 className="text-4xl font-black mt-2">Welcome back, {kidSession.childName}</h1>
              <p className="font-semibold text-white/80 mt-2">Choose a 20-question learning set and earn more points.</p>
            </div>
            <button onClick={handleKidLogout} className="btn-secondary text-sm py-2 px-4">
              Switch Child
            </button>
          </div>

          <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-4xl p-6 text-white flex flex-col lg:flex-row gap-6 justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-4xl bg-white/15 flex items-center justify-center text-5xl">
                {kidSession.avatar}
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-white/70">Reward balance</p>
                <p className="text-4xl font-black">{rewardBalance} points</p>
              </div>
            </div>
            <div className="max-w-xl">
              <p className="text-sm font-bold text-white/75">
                PIN is the active login path. Finish your set, win points, and stop or move to the next 20-question mission.
              </p>
              {kidSession.lastSubject && (
                <div className="mt-4 bg-white/10 rounded-3xl p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Resume learning</p>
                  <p className="text-xl font-black mt-1">
                    {kidSession.lastSubject === "maths" ? "Maths" : kidSession.lastSubject === "science" ? "Science" : "Writing"}
                  </p>
                  <button
                    onClick={() => openSubject(kidSession.lastSubject as Subject)}
                    className="mt-3 btn-primary text-sm py-2 px-4"
                  >
                    Continue last set
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderSubjectButton("maths", "Maths", "maths-gradient")}
            {renderSubjectButton("english", "Writing", "english-gradient")}
            {renderSubjectButton("science", "Science", "science-gradient")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md bg-white rounded-4xl shadow-kid p-8"
      >
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-20 h-20 rounded-4xl bg-cyan-50 flex items-center justify-center text-5xl">
              {activeChild.avatar}
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-800">{activeChild.childName}</h1>
          <p className="text-sm font-semibold text-slate-500 mt-2">Enter your PIN to start your next 20-question set.</p>
        </div>

        <form onSubmit={handlePinLogin} className="space-y-4 mt-6">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4,6}"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input-field text-center tracking-[0.5em]"
              placeholder="0000"
              minLength={4}
              maxLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting || pin.length < 4}
            className="w-full btn-primary disabled:opacity-60"
          >
            {submitting ? "Opening..." : "Enter KidLearn"}
          </button>
        </form>

        <div className="mt-6 flex justify-center">
          <Link href="/dashboard" className="text-sm font-bold text-slate-500 hover:text-slate-700">
            Parent dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function KidsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600">
          <div className="text-center text-white">
            <div className="spinner mx-auto mb-4" />
            <p className="font-black text-xl">Opening Kid PIN Login...</p>
          </div>
        </div>
      }
    >
      <KidsContent />
    </Suspense>
  );
}
