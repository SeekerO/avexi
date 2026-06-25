"use client";

import { useState } from "react";
import { compareExcelFilesFuzzy } from "@/lib/util/compare";
import SideMenu from "./components/sidemenu";
import { useAuth } from "../../lib/auth/AuthContext";
import { IoAnalytics } from "react-icons/io5";
import { MdDelete } from "react-icons/md";
import { Sparkles, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  NoResults,
  LoadingState,
  DataSetPanel,
  ResultItem,
} from "./components/supporting";
import { logActivity } from "@/lib/firebase/firebase.actions.firestore/offlineLogger";
import { CreditGate, CreditBadge } from "@/lib/components/creditComponent/CreditGate";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FuzzyResult {
  row1: string[];
  bestMatch: string[];
  score: number;
}

interface AIMatchResult {
  source: string[];
  bestMatch: string[] | null;
  score: number;
  reason: string;
  matchType:
    | "exact"
    | "nickname"
    | "transposed"
    | "abbreviated"
    | "phonetic"
    | "other"
    | "no_match";
}

// ── Match type badge ──────────────────────────────────────────────────────────

const MATCH_TYPE_STYLES: Record<
  AIMatchResult["matchType"],
  { label: string; className: string }
> = {
  exact:       { label: "Exact",       className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  nickname:    { label: "Nickname",    className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  transposed:  { label: "Transposed",  className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  abbreviated: { label: "Abbreviated", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  phonetic:    { label: "Phonetic",    className: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
  other:       { label: "Other",       className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  no_match:    { label: "No Match",    className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

// ── AI Result Card ────────────────────────────────────────────────────────────

const AIResultItem = ({ result }: { result: AIMatchResult }) => {
  const [expanded, setExpanded] = useState(false);
  const style = MATCH_TYPE_STYLES[result.matchType];
  const scoreColor =
    result.score >= 90
      ? "text-emerald-400"
      : result.score >= 75
        ? "text-indigo-400"
        : "text-amber-400";

  return (
    <div className="group relative p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 transition-all duration-300 shadow-sm">
      {/* AI badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30">
        <Sparkles className="w-2.5 h-2.5 text-violet-400" />
        <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">AI</span>
      </div>

      <div className="flex items-start justify-between mb-2 pr-14">
        <div className="flex flex-col min-w-0">
          <span className="text-white/90 font-semibold truncate tracking-tight text-base">
            {result.source[0]}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              Best Match
            </span>
            <span className="text-sm text-violet-400 font-medium truncate italic">
              {result.bestMatch?.[0] ?? "—"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl border border-violet-500/30 bg-violet-500/10 flex-shrink-0 ml-2">
          <span className={`text-lg font-bold ${scoreColor}`}>{result.score}</span>
          <span className="text-[8px] uppercase font-black text-slate-500">%</span>
        </div>
      </div>

      {/* Match type + reason row */}
      <div className="flex items-center gap-2 mt-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.className}`}
        >
          {style.label}
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          {expanded ? (
            <>Hide reason <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>Why? <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      </div>

      {expanded && (
        <p className="mt-2 text-[11px] text-slate-400 leading-relaxed border-t border-white/[0.06] pt-2">
          {result.reason}
        </p>
      )}

      {/* Secondary columns */}
      {(result.source[1] || result.bestMatch?.[1]) && (
        <div className="mt-3 pt-3 border-t border-slate-100/10 grid grid-cols-2 gap-4">
          <span className="text-xs text-slate-500 truncate">{result.source[1] ?? "—"}</span>
          <span className="text-xs text-violet-500/70 truncate">
            {result.bestMatch?.[1] ?? "—"}
          </span>
        </div>
      )}
    </div>
  );
};

// ── AI Panel (tab content) ────────────────────────────────────────────────────

const AIPanel = ({
  res,
  aiResults,
  aiLoading,
  aiError,
  hasRun,
  onRunAI,
}: {
  res: any;
  aiResults: AIMatchResult[];
  aiLoading: boolean;
  aiError: string | null;
  hasRun: boolean;
  onRunAI: () => void;
}) => {
  if (!res) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
        <Sparkles className="w-12 h-12 text-violet-400 mb-4" />
        <p className="text-sm font-bold text-slate-300">AI Analysis Idle</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Run a fuzzy match first, then use AI to find additional matches in
          the unmatched list.
        </p>
      </div>
    );
  }

  if (aiLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-slate-300 font-medium animate-pulse">
            AI Analyzing Unmatched Records…
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Detecting nicknames, transposed names, abbreviations
          </p>
        </div>
      </div>
    );
  }

  if (aiError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-6">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-red-300 text-center max-w-xs">{aiError}</p>
        <button
          onClick={onRunAI}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-500/20 border border-violet-500/30 text-violet-400 hover:bg-violet-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!hasRun) {
    const unmatchedCount = res.unmatched?.length ?? 0;
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-5">
        <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
          <Sparkles className="w-8 h-8 text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-200">
            AI Semantic Matching
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            {unmatchedCount > 0
              ? `${unmatchedCount} unmatched row${unmatchedCount !== 1 ? "s" : ""} found. AI can detect nicknames, transposed names, abbreviations, and phonetic variants that fuzzy matching missed.`
              : "All rows were matched by fuzzy analysis. You can still run AI to review borderline matches."}
          </p>
        </div>
        <button
          onClick={onRunAI}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-lg shadow-violet-500/20"
        >
          <Sparkles className="w-4 h-4" />
          Run AI Analysis
        </button>
      </div>
    );
  }

  if (aiResults.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
        <Sparkles className="w-10 h-10 text-violet-400 mb-3" />
        <p className="text-sm font-bold text-slate-300">No Additional Matches</p>
        <p className="text-xs text-slate-500 mt-1">
          AI couldn't find confident matches for the remaining unmatched rows.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1 pb-1 border-b border-white/[0.06]">
        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">
          {aiResults.length} AI-discovered match{aiResults.length !== 1 ? "es" : ""}
        </span>
      </div>
      {aiResults.map((result, index) => (
        <AIResultItem key={index} result={result} />
      ))}
    </div>
  );
};

// ── Main Matcher Page ─────────────────────────────────────────────────────────

const TOOL_ID = "matcher";

const Matcher = () => {
  const { user } = useAuth();
  const [dataset1, setDataSet1] = useState<File | null>(null);
  const [dataset2, setDataSet2] = useState<File | null>(null);
  const [res, setRes] = useState<any>(null);
  const [inputSearch, setInputSearch] = useState<string>("");
  const [threshold, SetThreshold] = useState<number>(85);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // AI state
  const [activeTab, setActiveTab] = useState<"fuzzy" | "ai">("fuzzy");
  const [aiResults, setAiResults] = useState<AIMatchResult[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiHasRun, setAiHasRun] = useState(false);

  // ── Fuzzy match ────────────────────────────────────────────────────────────

  const handleMatchingMethod = async () => {
    if (!dataset1 || !dataset2) return;
    setLoading(true);
    setError(null);
    setRes(null);
    setAiResults([]);
    setAiHasRun(false);
    try {
      const file1Buffer = await dataset1.arrayBuffer();
      const file2Buffer = await dataset2.arrayBuffer();
      const result = await compareExcelFilesFuzzy(
        Buffer.from(file1Buffer),
        Buffer.from(file2Buffer),
        threshold,
      );
      if (!user) return;

      await logActivity({
        userName: user.displayName ?? "Unknown",
        userEmail: user.email ?? "unknown@email.com",
        function: `process_comparison_analysis`,
        urlPath: "/Documents/Pdf",
      });
      setRes(result);
      setActiveTab("fuzzy");
    } catch (err: any) {
      setError("An error occurred during matching. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── AI compare ─────────────────────────────────────────────────────────────

  const handleAICompare = async () => {
    if (!res) return;
    setAiLoading(true);
    setAiError(null);
    setAiHasRun(false);

    try {
      // Use unmatched rows as the sources for AI to re-examine
      const sources: string[][] = (res.unmatched ?? []).map((r: any[]) =>
        r.map((v) => String(v ?? ""))
      );

      const dataset2Strings: string[][] = (res.data2 ?? []).map((r: any[]) =>
        r.map((v) => String(v ?? ""))
      );

      if (sources.length === 0) {
        // Nothing unmatched — run AI over borderline fuzzy matches instead
        const borderline: string[][] = (res.matched ?? [])
          .filter((m: any) => m.score < 90)
          .slice(0, 20)
          .map((m: any) => m.row1.map((v: any) => String(v ?? "")));

        if (borderline.length === 0) {
          setAiResults([]);
          setAiHasRun(true);
          setAiLoading(false);
          return;
        }

        const bordRes = await fetch("/api/ai-compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sources: borderline,
            dataset2: dataset2Strings,
            threshold: 60,
          }),
        });

        const bordData = await bordRes.json();
        if (!bordRes.ok) throw new Error(bordData.error ?? "AI request failed.");
        setAiResults(bordData.results ?? []);
        setAiHasRun(true);
        setAiLoading(false);
        return;
      }

      // Batch into groups of 15 to keep prompt size manageable
      const BATCH = 15;
      const allResults: AIMatchResult[] = [];

      for (let i = 0; i < sources.length; i += BATCH) {
        const batch = sources.slice(i, i + BATCH);
        const batchRes = await fetch("/api/ai-compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sources: batch,
            dataset2: dataset2Strings,
            threshold: 60,
          }),
        });

        const batchData = await batchRes.json();
        if (!batchRes.ok)
          throw new Error(batchData.error ?? "AI batch request failed.");

        allResults.push(...(batchData.results ?? []));
      }

      // Filter out no_match results
      setAiResults(allResults.filter((r) => r.matchType !== "no_match" && r.bestMatch !== null));
      setAiHasRun(true);
    } catch (err: any) {
      setAiError(err.message ?? "AI analysis failed.");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Filter helpers ─────────────────────────────────────────────────────────

  const filterData = (data: any[]) => {
    if (!inputSearch) return data;
    const search = inputSearch.toLowerCase();
    return data?.filter((item: string[]) =>
      item.some((value) => value?.toString().toLowerCase().includes(search)),
    );
  };

  const filteredData1 = filterData(res?.data1);
  const filteredData2 = filterData(res?.data2);

  const filteredResults = res?.matched?.filter((item: any) => {
    const search = inputSearch.toLowerCase();
    const sourceText = item?.row1?.[0]?.toString().toLowerCase() || "";
    const matchText = item?.bestMatch?.[0]?.toString().toLowerCase() || "";
    return sourceText.includes(search) || matchText.includes(search);
  });

  const handleDeleteData = () => {
    setDataSet1(null);
    setDataSet2(null);
    setRes(null);
    setInputSearch("");
    setAiResults([]);
    setAiHasRun(false);
    setAiError(null);
    setActiveTab("fuzzy");
  };

  if (!user && !(user as any)?.canChat) return null;

  const fuzzyMatchCount = res?.matched?.length ?? 0;
  const aiMatchCount = aiResults.length;

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-[#0b0e14] text-slate-600 dark:text-slate-200 font-sans antialiased flex flex-col p-4 lg:p-6 overflow-hidden transition-colors duration-300">
      <main className="flex-1 w-full flex flex-col lg:flex-row gap-6 min-h-0">

        {/* ── Side Panels ── */}
        <section className="flex flex-col w-full lg:w-[40%] gap-4 h-full">
          <DataSetPanel
            title="Data Set UNO"
            data={res?.data1}
            filteredData={filteredData1}
            inputSearch={inputSearch}
            setInputSearch={setInputSearch}
            setDataSet={setDataSet1}
          />
          <DataSetPanel
            title="Data Set DOS"
            data={res?.data2}
            filteredData={filteredData2}
            inputSearch={inputSearch}
            setInputSearch={setInputSearch}
            setDataSet={setDataSet2}
          />
        </section>

        {/* ── Results Panel ── */}
        <section className="flex flex-col w-full lg:w-[60%] bg-white dark:bg-[#11161d] border border-slate-200 dark:border-slate-800/60 rounded-2xl shadow-xl p-6 h-full overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                <IoAnalytics size={20} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Comparison Analysis
              </h2>
              <CreditBadge toolId={TOOL_ID} />
            </div>

            <div className="flex items-center gap-3">
              {dataset1 && dataset2 && !res && (
                <CreditGate toolId={TOOL_ID}>
                  {({ onAction, hasCredits, isUnlimited, loading: cLoading }) => (
                    <button
                      onClick={() => onAction(handleMatchingMethod)}
                      disabled={cLoading || (!hasCredits && !isUnlimited)}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                        bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700
                        text-white text-sm font-medium transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cLoading
                        ? "Processing..."
                        : !hasCredits && !isUnlimited
                          ? "No Credits Left"
                          : "Run Match"}
                    </button>
                  )}
                </CreditGate>
              )}
              {res && (
                <button
                  onClick={handleDeleteData}
                  className="p-2.5 rounded-xl bg-rose-50 dark:bg-red-500/10 text-rose-600 dark:text-red-400 hover:bg-rose-100 transition-colors"
                >
                  <MdDelete size={22} />
                </button>
              )}
              <SideMenu
                res={res}
                threshold={threshold}
                SetThreshold={SetThreshold}
              />
            </div>
          </div>

          {/* ── Tab bar (only after a match run) ── */}
          {res && !loading && (
            <div className="flex items-center gap-1 mb-4 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
              <button
                onClick={() => setActiveTab("fuzzy")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "fuzzy"
                    ? "bg-white dark:bg-[#161b22] text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                }`}
              >
                <IoAnalytics size={14} />
                Fuzzy
                {fuzzyMatchCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                    {fuzzyMatchCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab("ai");
                  if (!aiHasRun && !aiLoading) handleAICompare();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "ai"
                    ? "bg-white dark:bg-[#161b22] text-violet-600 dark:text-violet-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                }`}
              >
                <Sparkles size={14} />
                AI Assist
                {aiHasRun && aiMatchCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-[10px] font-black text-violet-600 dark:text-violet-400">
                    +{aiMatchCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* ── Content area ── */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {error ? (
              <div className="h-full flex items-center justify-center text-red-600 bg-red-50 rounded-xl border border-red-200">
                {error}
              </div>
            ) : loading ? (
              <LoadingState />
            ) : activeTab === "fuzzy" ? (
              filteredResults?.length > 0 ? (
                filteredResults.map((value: any, index: number) => (
                  <ResultItem key={index} value={value} />
                ))
              ) : (
                <NoResults
                  message={
                    res
                      ? "No matches found for your search."
                      : "Upload datasets to begin."
                  }
                />
              )
            ) : (
              /* AI tab */
              <AIPanel
                res={res}
                aiResults={aiResults}
                aiLoading={aiLoading}
                aiError={aiError}
                hasRun={aiHasRun}
                onRunAI={handleAICompare}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Matcher;