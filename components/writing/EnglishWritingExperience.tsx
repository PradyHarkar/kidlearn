"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Mascot } from "@/components/mascot/Mascot";
import { HandwritingPad } from "@/components/writing/HandwritingPad";
import { getThemeJourneyTokens } from "@/lib/services/tile-themes";
import { reviewWritingStep } from "@/lib/services/writing-feedback";
import { getWritingCurriculum, getWritingModeBlueprint, isWritingMvpEnabled } from "@/lib/services/writing-curriculum";
import type { Child, WritingMode, WritingSessionState, WritingStepState } from "@/types";

interface EnglishWritingExperienceProps {
  childId: string | null;
}

function buildInitialSteps(mode: WritingMode): WritingStepState[] {
  return getWritingModeBlueprint(mode).steps.map((step) => ({
    stepName: step.stepName,
    label: step.label,
    content: "",
    feedback: reviewWritingStep(mode, step, "").suggestions,
    words: 0,
    penImageDataUrl: "",
  }));
}

function draftText(steps: WritingStepState[]) {
  return steps.map((step) => step.content.trim()).filter(Boolean).join("\n\n");
}

export function EnglishWritingExperience({ childId }: EnglishWritingExperienceProps) {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryMode = searchParams.get("mode") as WritingMode | null;
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState<Child | null>(null);
  const [availableSessions, setAvailableSessions] = useState<Record<WritingMode, WritingSessionState | null>>({
    narrative: null,
    persuasive: null,
  });
  const [selectedMode, setSelectedMode] = useState<WritingMode | null>(queryMode);
  const [steps, setSteps] = useState<WritingStepState[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [penDataUrl, setPenDataUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  const theme = useMemo(() => {
    if (!child) {
      return getThemeJourneyTokens(undefined, { ageGroup: "year3", yearLevel: "year3", country: "AU" });
    }
    return getThemeJourneyTokens(child.preferences?.theme || child.tileThemeId || undefined, child);
  }, [child]);

  const curriculum = useMemo(() => (child ? getWritingCurriculum(child) : null), [child]);
  const activeBlueprint = useMemo(() => (selectedMode ? getWritingModeBlueprint(selectedMode) : null), [selectedMode]);
  const currentStep = activeBlueprint ? steps[currentStepIndex] : null;
  const currentReview = currentStep && selectedMode && activeBlueprint
    ? reviewWritingStep(selectedMode, activeBlueprint.steps[currentStepIndex], currentStep.content)
    : null;
  const activeSession = selectedMode ? availableSessions[selectedMode] : null;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!childId) {
      router.push("/dashboard");
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [childrenRes, narrativeRes, persuasiveRes] = await Promise.all([
          fetch("/api/children"),
          fetch(`/api/writing/session?childId=${encodeURIComponent(childId)}&mode=narrative`),
          fetch(`/api/writing/session?childId=${encodeURIComponent(childId)}&mode=persuasive`),
        ]);
        const childrenData = await childrenRes.json();
        setChild((childrenData.children || []).find((item: Child) => item.childId === childId) || null);
        const narrativeData = await narrativeRes.json();
        const persuasiveData = await persuasiveRes.json();
        setAvailableSessions({
          narrative: narrativeRes.ok ? narrativeData.session ?? null : null,
          persuasive: persuasiveRes.ok ? persuasiveData.session ?? null : null,
        });
        if (queryMode === "narrative") {
          if (narrativeData.session) {
            hydrateSession(narrativeData.session);
          } else {
            const initialSteps = buildInitialSteps("narrative");
            setSelectedMode("narrative");
            setSteps(initialSteps);
            setCurrentStepIndex(0);
            setPenDataUrl("");
            void persistDraft(initialSteps, 0, "narrative");
          }
        }
        if (queryMode === "persuasive") {
          if (persuasiveData.session) {
            hydrateSession(persuasiveData.session);
          } else {
            const initialSteps = buildInitialSteps("persuasive");
            setSelectedMode("persuasive");
            setSteps(initialSteps);
            setCurrentStepIndex(0);
            setPenDataUrl("");
            void persistDraft(initialSteps, 0, "persuasive");
          }
        }
      } catch {
        toast.error("Failed to load writing studio");
      } finally {
        setLoading(false);
      }
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  useEffect(() => {
    if (!selectedMode || !childId || !child || !steps.length) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void persistDraft();
    }, 700);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, currentStepIndex, selectedMode, childId, child]);

  useEffect(() => {
    if (!selectedMode) return;
    router.replace(`/learn?child=${childId}&subject=english&mode=${selectedMode}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMode]);

  async function persistDraft(nextSteps = steps, nextIndex = currentStepIndex, modeOverride?: WritingMode) {
    const mode = modeOverride || selectedMode;
    if (!mode || !childId || !child) return;
    setSaving(true);
    try {
      const res = await fetch("/api/writing/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          writingMode: mode,
          country: child.country,
          ageGroup: child.ageGroup || child.yearLevel,
          steps: nextSteps,
          currentStepIndex: nextIndex,
          isComplete: false,
          originalDraft: nextSteps[0]?.content || "",
          finalDraft: draftText(nextSteps),
          revisedDraft: draftText(nextSteps),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAvailableSessions((current) => ({ ...current, [mode]: data.session }));
      }
    } catch {
      // best effort
    } finally {
      setSaving(false);
    }
  }

  function hydrateSession(session: WritingSessionState) {
    setSelectedMode(session.writingMode);
    setSteps(session.steps.length ? session.steps : buildInitialSteps(session.writingMode));
    setCurrentStepIndex(session.currentStepIndex || 0);
    setPenDataUrl(session.steps?.[session.currentStepIndex || 0]?.penImageDataUrl || "");
    setResult(null);
  }

  function beginMode(mode: WritingMode) {
    const existing = availableSessions[mode];
    if (existing) {
      hydrateSession(existing);
      return;
    }
    const initialSteps = buildInitialSteps(mode);
    setSelectedMode(mode);
    setSteps(initialSteps);
    setCurrentStepIndex(0);
    setPenDataUrl("");
    setResult(null);
    void persistDraft(initialSteps, 0, mode);
  }

  function updateStep(content: string, nextPenDataUrl: string) {
    if (!selectedMode || !activeBlueprint) return;
    const blueprintStep = activeBlueprint.steps[currentStepIndex];
    const review = reviewWritingStep(selectedMode, blueprintStep, content);
    const nextSteps = steps.map((step, index) =>
      index === currentStepIndex
        ? {
            ...step,
            content,
            feedback: review.suggestions,
            words: review.words,
            penImageDataUrl: nextPenDataUrl || step.penImageDataUrl || "",
            completedAt: content.trim() ? new Date().toISOString() : undefined,
          }
        : step
    );
    setSteps(nextSteps);
    setPenDataUrl(nextPenDataUrl);
  }

  async function goNext() {
    if (!activeBlueprint || !selectedMode) return;
    if (currentStepIndex < activeBlueprint.steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      await persistDraft(steps, nextIndex);
      setPenDataUrl(steps[nextIndex]?.penImageDataUrl || "");
      return;
    }
    await submitWriting();
  }

  async function goBack() {
    if (currentStepIndex <= 0) return;
    const nextIndex = currentStepIndex - 1;
    setCurrentStepIndex(nextIndex);
    setPenDataUrl(steps[nextIndex]?.penImageDataUrl || "");
    await persistDraft(steps, nextIndex);
  }

  async function submitWriting() {
    if (!selectedMode || !childId || !activeBlueprint) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/writing/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          writingMode: selectedMode,
          steps,
          originalDraft: steps[0]?.content || "",
          revisedDraft: draftText(steps),
          finalDraft: draftText(steps),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit writing");
      setResult(data.result);
      setAvailableSessions((current) => ({ ...current, [selectedMode]: null }));
      toast.success("Writing mission complete! ✨");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit writing");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !child || !curriculum) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <Mascot mood="thinking" size="md" className="mb-4" />
          <p className="text-2xl font-black text-slate-800">Loading writing studio... ✨</p>
        </div>
      </div>
    );
  }

  if (!curriculum.enabled) {
    return (
      <div className={`min-h-screen ${theme.pageGradient} px-4 py-6`}>
        <div className="max-w-4xl mx-auto pt-10">
          <div className={`${theme.questionStageShell} rounded-[2rem] p-6 sm:p-8`}>
            <h1 className="text-3xl font-black text-slate-900">English Writing Studio</h1>
            <p className="mt-2 text-base font-semibold text-slate-700">{curriculum.subtitle}</p>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = activeBlueprint ? ((currentStepIndex + (result ? 1 : 0)) / activeBlueprint.steps.length) * 100 : 0;

  if (!selectedMode && !result) {
    return (
      <div className={`min-h-screen ${theme.pageGradient} relative overflow-hidden`}>
        <div className="absolute inset-0 pointer-events-none opacity-35" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.14), rgba(255,255,255,0.14)), url(${theme.backgroundImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-5">
          <section className={`relative overflow-hidden rounded-[2.25rem] border shadow-2xl ${theme.surfaceBorder} ${theme.heroPanel}`}>
            <div className="absolute inset-0 bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url(${theme.backgroundImageUrl})` }} />
            <div className="absolute inset-0 bg-slate-950/55 pointer-events-none" />
            <div className="relative z-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] items-center p-6 sm:p-8">
              <div className={`rounded-[2rem] ${theme.bannerShell} p-5 sm:p-6`}>
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.22em] ${theme.bannerAccent}`}>
                  📖 English Writing Studio
                </div>
                <h1 className={`mt-4 text-3xl sm:text-4xl lg:text-5xl font-black ${theme.bannerTitle}`}>Writing becomes the core adventure</h1>
                <p className={`mt-3 text-base sm:text-lg font-semibold max-w-2xl ${theme.bannerText}`}>
                  {curriculum.subtitle} Choose a mission, write with the keyboard or pen, and keep your draft growing.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={`rounded-[1.7rem] ${theme.questionStageShell} p-4`}>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">Home focus</p>
                  <p className={`mt-1 text-xl font-black ${theme.questionStageTitle}`}>Writing first</p>
                  <p className={`mt-1 text-sm font-semibold ${theme.questionStageText}`}>Narrative and persuasive missions, one screen at a time.</p>
                </div>
                <div className={`rounded-[1.7rem] ${theme.questionStageShell} p-4`}>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">Resume</p>
                  <p className={`mt-1 text-xl font-black ${theme.questionStageTitle}`}>{activeSession ? "Continue Draft" : "No draft yet"}</p>
                  <p className={`mt-1 text-sm font-semibold ${theme.questionStageText}`}>{activeSession ? `Continue your ${activeSession.writingMode} draft.` : "Start a new writing mission."}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="space-y-4">
              <section className={`rounded-[2rem] p-5 sm:p-6 border shadow-kid ${theme.surfaceCard} ${theme.surfaceBorder}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Writing modes</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900">Choose a mission</h2>
                  </div>
                  <span className={`${theme.badge} rounded-full px-3 py-1 text-xs font-black`}>Year 3 AU</span>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {(["narrative", "persuasive"] as WritingMode[]).map((mode) => {
                    const blueprint = curriculum.modes[mode];
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => beginMode(mode)}
                        className={`text-left rounded-[1.8rem] p-5 border ${theme.questionStageShell}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{blueprint.durationMinutes} min</p>
                            <h3 className={`mt-1 text-2xl font-black ${theme.questionStageTitle}`}>{blueprint.label}</h3>
                          </div>
                          <span className="text-3xl">{mode === "narrative" ? "📚" : "🗣️"}</span>
                        </div>
                        <p className={`mt-2 text-sm font-semibold ${theme.questionStageText}`}>{blueprint.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {activeSession && (
                <section className={`rounded-[2rem] p-5 sm:p-6 border shadow-kid ${theme.surfaceCard} ${theme.surfaceBorder}`}>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Continue Draft</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">{activeSession.writingMode === "narrative" ? "Narrative" : "Persuasive"} saved</h2>
                  <button type="button" onClick={() => hydrateSession(activeSession)} className={`mt-4 rounded-full px-5 py-3 text-sm font-black ${theme.primaryButton}`}>
                    Continue Draft
                  </button>
                </section>
              )}
            </div>
            <aside className="space-y-4">
              <section className={`rounded-[2rem] p-5 border shadow-kid ${theme.surfaceCard} ${theme.surfaceBorder}`}>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Reading</p>
                <p className="mt-2 text-lg font-black text-slate-900">Reading stays beside writing</p>
              </section>
              <section className={`rounded-[2rem] p-5 border shadow-kid ${theme.surfaceCard} ${theme.surfaceBorder}`}>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Spelling</p>
                <p className="mt-2 text-lg font-black text-slate-900">Spelling stays supported</p>
              </section>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.pageGradient} relative overflow-hidden`}>
      <div className="absolute inset-0 pointer-events-none opacity-35" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0.12)), url(${theme.backgroundImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }} />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-4 sm:py-5">
        <section className={`relative overflow-hidden rounded-[2.2rem] border shadow-2xl ${theme.surfaceBorder} ${theme.heroPanel}`}>
          <div className="absolute inset-0 bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url(${theme.backgroundImageUrl})` }} />
          <div className="absolute inset-0 bg-slate-950/58 pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-5 p-5 sm:p-6 lg:p-8 items-center">
            <div className={`rounded-[2rem] ${theme.bannerShell} px-4 py-4 sm:px-5 sm:py-5`}>
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] sm:text-xs font-black uppercase tracking-[0.22em] shadow-sm ${theme.bannerAccent}`}>
                📖 {activeBlueprint?.label || "English Writing Studio"}
              </div>
              <h1 className={`mt-4 text-3xl sm:text-4xl lg:text-5xl font-black leading-tight ${theme.bannerTitle}`}>
                {activeBlueprint ? `${activeBlueprint.label} Mission` : `${child.childName}'s Writing Adventure`}
              </h1>
              <p className={`mt-2 text-base sm:text-lg font-semibold max-w-2xl ${theme.bannerText}`}>
                {activeBlueprint ? "Write one step at a time, use the pen or keyboard, and keep your draft growing." : curriculum.subtitle}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1.5 text-sm font-black ${theme.bannerPill}`}>🧩 {currentStepIndex + 1}/{activeBlueprint?.steps.length || 0}</span>
                <span className={`rounded-full px-3 py-1.5 text-sm font-black ${theme.bannerPill}`}>🎁 {child.rewardPoints || 0} points</span>
                <span className={`rounded-full px-3 py-1.5 text-sm font-black ${theme.bannerPill}`}>{saving ? "Saving..." : "Auto-save on"}</span>
              </div>
            </div>
            <div className="rounded-[1.9rem] bg-white/90 backdrop-blur-md border border-white/75 shadow-2xl overflow-hidden">
              <div className="grid grid-cols-2 gap-3 p-4">
                <div className="rounded-[1.3rem] bg-sky-50/90 p-3"><p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-600">Mode</p><p className="mt-1 text-2xl font-black text-slate-800">{selectedMode ? activeBlueprint?.label : "Home"}</p></div>
                <div className="rounded-[1.3rem] bg-emerald-50/90 p-3"><p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Words</p><p className="mt-1 text-2xl font-black text-slate-800">{steps.reduce((sum, step) => sum + step.words, 0)}</p></div>
                <div className="rounded-[1.3rem] bg-amber-50/90 p-3"><p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">Points</p><p className="mt-1 text-2xl font-black text-slate-800">{result?.pointsEarned ?? 0}</p></div>
                <div className="rounded-[1.3rem] bg-fuchsia-50/90 p-3"><p className="text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-600">Progress</p><p className="mt-1 text-2xl font-black text-slate-800">{Math.round(progressPct)}%</p></div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
          <div className={`rounded-[2.6rem] p-1.5 sm:p-2 ${theme.questionStageShell}`}>
            <div className={`${theme.heroPanelSoft} rounded-[2.2rem] p-5 sm:p-6`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Step {currentStepIndex + 1}</p>
                  <h2 className={`mt-1 text-3xl font-black ${theme.questionStageTitle}`}>{activeBlueprint?.steps[currentStepIndex]?.label}</h2>
                  <p className={`mt-2 text-base font-semibold ${theme.questionStageText}`}>{activeBlueprint?.steps[currentStepIndex]?.prompt}</p>
                </div>
                <button type="button" onClick={() => router.push("/dashboard")} className={`rounded-full px-4 py-2 text-sm font-black ${theme.questionStageButton}`}>Exit</button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {activeBlueprint?.steps.map((step, index) => (
                  <span key={step.stepName} className={`rounded-full px-3 py-1.5 text-xs font-black ${index === currentStepIndex ? theme.primaryButton : theme.questionStageChip}`}>{steps[index]?.content.trim() ? "✅" : "•"} {step.label}</span>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-black text-slate-600">Your writing</label>
                <textarea
                  value={currentStep?.content || ""}
                  onChange={(e) => updateStep(e.target.value, penDataUrl)}
                  placeholder="Start writing here..."
                  className="w-full min-h-[190px] rounded-[1.5rem] border-2 border-slate-200 bg-white/95 px-4 py-3 text-slate-900 text-lg font-medium shadow-inner outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />
              </div>

              <HandwritingPad
                value={penDataUrl}
                onChange={(nextValue) => updateStep(currentStep?.content || "", nextValue)}
                label="Stylus pad"
              />

              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/90 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Hint</p>
                <p className="mt-1 text-sm font-semibold text-amber-900">{activeBlueprint?.steps[currentStepIndex]?.hint}</p>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white/95 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Feedback</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{currentReview?.headline}</p>
                  </div>
                  <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-black text-cyan-700">{currentReview?.score ?? 0}/100</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(currentReview?.suggestions || []).map((suggestion) => (
                    <span key={suggestion} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{suggestion}</span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={currentStepIndex === 0}
                  className={`flex-1 rounded-full px-5 py-3 text-sm font-black ${currentStepIndex === 0 ? "bg-slate-100 text-slate-400" : theme.secondaryButton}`}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={submitting || !currentStep?.content.trim()}
                  className={`flex-[2] rounded-full px-5 py-3 text-sm font-black ${theme.primaryButton}`}
                >
                  {submitting ? "Saving..." : currentStepIndex >= (activeBlueprint?.steps.length || 1) - 1 ? "Finish writing mission" : "Next step →"}
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <section className={`rounded-[2rem] p-5 border shadow-kid ${theme.surfaceCard} ${theme.surfaceBorder}`}>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Reading</p>
              <p className="mt-2 text-lg font-black text-slate-900">Reading stays beside writing</p>
            </section>
            <section className={`rounded-[2rem] p-5 border shadow-kid ${theme.surfaceCard} ${theme.surfaceBorder}`}>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Spelling</p>
              <p className="mt-2 text-lg font-black text-slate-900">Spelling stays supported</p>
            </section>
          </aside>
        </div>

        {activeSession && !selectedMode && (
          <div className={`mt-5 rounded-[2rem] p-5 border shadow-kid ${theme.surfaceCard} ${theme.surfaceBorder}`}>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Continue Draft</p>
            <p className="mt-2 text-lg font-black text-slate-900">{activeSession.writingMode === "narrative" ? "Narrative" : "Persuasive"} saved</p>
            <button type="button" onClick={() => hydrateSession(activeSession)} className={`mt-4 rounded-full px-5 py-3 text-sm font-black ${theme.primaryButton}`}>Continue Draft</button>
          </div>
        )}

        {result && (
          <div className={`mt-5 rounded-[2rem] p-5 sm:p-6 border shadow-kid ${theme.surfaceCard} ${theme.surfaceBorder}`}>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Writing complete</p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">Great writing effort!</h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">You earned points using the same reward system as the rest of KidLearn.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-sky-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">Words</p><p className="mt-1 text-2xl font-black text-slate-800">{result.totalWords}</p></div>
              <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Points</p><p className="mt-1 text-2xl font-black text-slate-800">+{result.pointsEarned}</p></div>
              <div className="rounded-2xl bg-fuchsia-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-600">Comparison</p><p className="mt-1 text-sm font-semibold text-slate-700">{result.comparison?.summary}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
