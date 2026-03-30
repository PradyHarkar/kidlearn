"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface ColoringSheet {
  id: string;
  theme: string;
  title: string;
  subtitle: string;
  file: string;
  ageGroup: string;
  tags: string[];
}

interface Manifest {
  generatedAt: string;
  totalSheets: number;
  themes: string[];
  sheets: ColoringSheet[];
}

const THEME_META: Record<string, { label: string; emoji: string; color: string }> = {
  alphabet:  { label: "Alphabet",  emoji: "🔤", color: "bg-blue-100 text-blue-700 border-blue-200" },
  numbers:   { label: "Numbers",   emoji: "🔢", color: "bg-green-100 text-green-700 border-green-200" },
  shapes:    { label: "Shapes",    emoji: "⬟",  color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  nature:    { label: "Nature",    emoji: "🌿",  color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ocean:     { label: "Ocean",     emoji: "🌊",  color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  space:     { label: "Space",     emoji: "🚀",  color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  patterns:  { label: "Patterns",  emoji: "🌀",  color: "bg-purple-100 text-purple-700 border-purple-200" },
  cultural:  { label: "Cultures",  emoji: "🌍",  color: "bg-rose-100 text-rose-700 border-rose-200" },
};

const AGE_GROUPS: Array<{ key: string; label: string }> = [
  { key: "all",        label: "All Ages" },
  { key: "foundation", label: "Foundation" },
  { key: "year1",      label: "Year 1–2" },
];

function PrintModal({ sheet, onClose }: { sheet: ColoringSheet; onClose: () => void }) {
  const handlePrint = useCallback(() => {
    const win = window.open(sheet.file, "_blank");
    if (win) {
      win.onload = () => {
        win.print();
      };
    }
  }, [sheet.file]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 20 }}
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* SVG Preview */}
          <div className="bg-gray-50 p-6 flex items-center justify-center" style={{ minHeight: 320 }}>
            <img
              src={sheet.file}
              alt={sheet.title}
              className="max-w-full max-h-72 object-contain drop-shadow-lg"
            />
          </div>

          {/* Info */}
          <div className="p-6">
            <h2 className="text-2xl font-black text-gray-900">{sheet.title}</h2>
            <p className="text-gray-500 font-semibold mt-1">{sheet.subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sheet.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handlePrint}
                className="flex-1 rounded-2xl bg-indigo-600 px-5 py-3 text-white font-black text-base shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
              >
                🖨️ Print / Save as PDF
              </button>
              <button
                onClick={onClose}
                className="rounded-2xl border-2 border-gray-200 px-5 py-3 font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Close
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-400 text-center">
              Opens in a new tab — use browser Print → Save as PDF to keep a copy
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SheetCard({ sheet, onClick }: { sheet: ColoringSheet; onClick: () => void }) {
  const meta = THEME_META[sheet.theme];
  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="group relative bg-white rounded-3xl shadow-md hover:shadow-xl border border-gray-100 overflow-hidden flex flex-col text-left transition-shadow"
    >
      {/* SVG preview area */}
      <div className="bg-gray-50 flex items-center justify-center p-4" style={{ height: 160 }}>
        <img
          src={sheet.file}
          alt={sheet.title}
          className="max-w-full max-h-36 object-contain"
          loading="lazy"
        />
      </div>

      {/* Theme badge */}
      <div className="absolute top-3 left-3">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase border ${meta?.color ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
          {meta?.emoji} {meta?.label}
        </span>
      </div>

      {/* Print hover overlay */}
      <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/8 transition-all flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full px-4 py-2 text-sm font-black text-indigo-700 shadow-lg">
          🖨️ Print
        </span>
      </div>

      {/* Footer */}
      <div className="p-3.5 border-t border-gray-100">
        <p className="font-black text-gray-800 text-sm leading-tight">{sheet.title}</p>
        <p className="text-gray-500 text-xs mt-0.5 font-semibold truncate">{sheet.subtitle}</p>
      </div>
    </motion.button>
  );
}

export default function ColoringPage() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [activeTheme, setActiveTheme] = useState<string>("all");
  const [activeAge, setActiveAge] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ColoringSheet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/coloring/manifest.json")
      .then((r) => r.json())
      .then((data: Manifest) => {
        setManifest(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = manifest?.sheets.filter((s) => {
    if (activeTheme !== "all" && s.theme !== activeTheme) return false;
    if (activeAge !== "all") {
      if (activeAge === "foundation" && s.ageGroup !== "foundation") return false;
      if (activeAge === "year1" && !["year1", "year2"].includes(s.ageGroup)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return s.title.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q) || s.tags.some((t) => t.includes(q));
    }
    return true;
  }) ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-white/60 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-700 transition-colors font-bold text-sm">
            ← Dashboard
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-black text-gray-900">🎨 Coloring Sheets</h1>
            <p className="text-xs text-gray-500 font-semibold">Print-ready sheets for kids · Free forever</p>
          </div>
          {manifest && (
            <span className="text-xs font-bold text-gray-400 hidden sm:block">
              {manifest.totalSheets} sheets available
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Theme filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTheme("all")}
            className={`rounded-full px-4 py-2 text-sm font-black border-2 transition-all ${
              activeTheme === "all"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
            }`}
          >
            All Themes
          </button>
          {Object.entries(THEME_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setActiveTheme(activeTheme === key ? "all" : key)}
              className={`rounded-full px-4 py-2 text-sm font-black border-2 transition-all ${
                activeTheme === key
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
              }`}
            >
              {meta.emoji} {meta.label}
            </button>
          ))}
        </div>

        {/* Age + Search row */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            {AGE_GROUPS.map((ag) => (
              <button
                key={ag.key}
                onClick={() => setActiveAge(ag.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-black border transition-all ${
                  activeAge === ag.key
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-purple-300"
                }`}
              >
                {ag.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search sheets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none bg-white"
          />
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-sm font-bold text-gray-500">
            Showing {filtered.length} sheet{filtered.length !== 1 ? "s" : ""}
            {activeTheme !== "all" && ` · ${THEME_META[activeTheme]?.label}`}
          </p>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl shadow-md overflow-hidden animate-pulse">
                <div className="bg-gray-100 h-40" />
                <div className="p-3.5">
                  <div className="h-3 bg-gray-200 rounded-full w-3/4 mb-2" />
                  <div className="h-2 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {filtered.map((sheet) => (
              <SheetCard key={sheet.id} sheet={sheet} onClick={() => setSelected(sheet)} />
            ))}
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🎨</p>
            <p className="text-xl font-black text-gray-600">No sheets found</p>
            <p className="text-gray-400 font-semibold mt-2">Try a different theme or age group</p>
          </div>
        )}

        {/* Cultural info card */}
        {(activeTheme === "all" || activeTheme === "cultural") && !loading && (
          <div className="bg-white/80 rounded-3xl p-5 border border-rose-100 shadow-sm mt-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌍</span>
              <div>
                <p className="font-black text-gray-800">Cultural Coloring Sheets</p>
                <p className="text-sm text-gray-600 font-semibold mt-1">
                  Currently showing placeholder frames for Indian history, Aboriginal art, Chinese culture, African wildlife, Hispanic heritage, European history, and Australian icons.
                  Higher-detail sheets from free Wikimedia Commons sources are being added progressively.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Print all tip */}
        <div className="bg-indigo-50/80 rounded-3xl p-5 border border-indigo-100 flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-black text-gray-800">Printing Tips</p>
            <p className="text-sm text-gray-600 font-semibold mt-1">
              Click any sheet to preview and print. Select <strong>Print → Save as PDF</strong> in your browser to keep digital copies.
              For best results print on A4 at 100% scale with &quot;Fit to page&quot; enabled.
            </p>
          </div>
        </div>
      </div>

      {/* Print modal */}
      {selected && <PrintModal sheet={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
