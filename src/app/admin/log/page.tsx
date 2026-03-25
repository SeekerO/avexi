"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Search, Activity, User, Mail, Zap, Link2,
    Clock, Filter, X, RefreshCw, ChevronDown,
    ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    getAllLogs,
    getLogsPaginated,
    searchLogs,

} from "@/lib/firebase/firebase.actions.firestore/logsFirestore";

interface LogsResponse {
    logs: Array<{
        id: string;
        userName: string;
        userEmail: string;
        function: string;
        urlPath: string;
        created: number; // milliseconds
    }>;
    page: number;
    pageSize: number;
    hasMore: boolean;
    totalFiltered: number | null;
}

type FilterField = "all" | "userName" | "userEmail" | "function" | "urlPath";

const FILTER_OPTIONS: { value: FilterField; label: string; icon: React.FC<{ className?: string }> }[] = [
    { value: "all", label: "All fields", icon: Filter },
    { value: "userName", label: "Name", icon: User },
    { value: "userEmail", label: "Email", icon: Mail },
    { value: "function", label: "Function", icon: Zap },
    { value: "urlPath", label: "URL Path", icon: Link2 },
];

const FN_COLORS: Record<string, string> = {
    handleToggleAdmin: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/25",
    handleToggleCanChat: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25",
    handleSavePermissions: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/25",
    _default: "bg-gray-50 dark:bg-white/[0.04] text-gray-600 dark:text-white/50 border-gray-200 dark:border-white/10",
};
const fnColor = (fn: string) => FN_COLORS[fn] ?? FN_COLORS._default;

function timeAgo(ts: number) {
    const d = Date.now() - ts;
    if (d < 60_000) return `${Math.floor(d / 1_000)}s ago`;
    if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
    if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
    return `${Math.floor(d / 86_400_000)}d ago`;
}

function fullDate(ts: number) {
    return new Date(ts).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
}

const PAGE_SIZE = 50;

export default function LogsPage() {
    const [data, setData] = useState<LogsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterField, setFilter] = useState<FilterField>("all");
    const [filterOpen, setFilterOpen] = useState(false);
    const [lastFetched, setLastFetched] = useState<number | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    // Debounce search input — avoids hitting Firestore on every keystroke
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // reset to page 1 on new search
        }, 400);
        return () => clearTimeout(t);
    }, [search]);

    // Reset page when filter changes
    useEffect(() => { setPage(1); }, [filterField]);

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Correctly type the temporary logs variable
            let rawLogs: any[] = [];

            if (debouncedSearch && filterField !== "all") {
                // Server-side specific field search
                rawLogs = await searchLogs(debouncedSearch, filterField as any) || [];
            } else if (debouncedSearch) {
                // Client-side "All Fields" search
                const allLogs = await getAllLogs() || [];
                const searchLower = debouncedSearch.toLowerCase();
                rawLogs = allLogs.filter((log: any) =>
                    log.userName?.toLowerCase().includes(searchLower) ||
                    log.userEmail?.toLowerCase().includes(searchLower) ||
                    log.function?.toLowerCase().includes(searchLower) ||
                    log.urlPath?.toLowerCase().includes(searchLower)
                );
            } else {
                // Standard Paginated fetch
                rawLogs = await getLogsPaginated(PAGE_SIZE, page) || [];
            }

            // 2. Map raw data to your LogEntry structure (handling Firestore Timestamps)
            const transformedLogs = rawLogs.map((log: any) => ({
                id: log.id,
                userName: log.userName || "Unknown",
                userEmail: log.userEmail || "N/A",
                function: log.function || "default",
                urlPath: log.urlPath || "/",
                created: log.createdAt?.toMillis?.() || log.createdAt || Date.now(),
            }));

            // 3. Handle Pagination Logic for UI
            // If we are searching, we slice the "allLogs" based on the current page
            const filteredCount = debouncedSearch ? transformedLogs.length : null;
            const start = (page - 1) * PAGE_SIZE;
            const paginatedLogs = debouncedSearch
                ? transformedLogs.slice(start, start + PAGE_SIZE)
                : transformedLogs;

            setData({
                logs: paginatedLogs,
                page,
                pageSize: PAGE_SIZE,
                hasMore: debouncedSearch
                    ? (start + PAGE_SIZE) < transformedLogs.length
                    : transformedLogs.length === PAGE_SIZE,
                totalFiltered: filteredCount,
            });

            setLastFetched(Date.now());
        } catch (err) {
            console.error("Error fetching logs:", err);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [page, debouncedSearch, filterField]);


    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    // Close filter dropdown on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node))
                setFilterOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const logs = data?.logs ?? [];
    const hasMore = data?.hasMore ?? false;
    const activeOpt = FILTER_OPTIONS.find(o => o.value === filterField)!;

    return (
        <div className="min-h-full w-full bg-gray-50 dark:bg-[#0f0e17] overflow-y-auto">

            {/* ── Sticky Header ── */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#0f0e17]/80 backdrop-blur-md
                border-b border-black/[0.06] dark:border-white/[0.06] px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                            <Activity className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-base font-semibold tracking-tight text-gray-800 dark:text-white/85">
                                Activity Logs
                            </h1>
                            <p className="text-[11px] text-gray-400 dark:text-white/30">
                                {isLoading
                                    ? "Loading…"
                                    : `Page ${page} · ${logs.length} rows${data?.totalFiltered != null ? ` of ${data.totalFiltered} matches` : ""}`}
                                {lastFetched && !isLoading && ` · ${timeAgo(lastFetched)}`}
                            </p>
                        </div>
                    </div>

                    {/* Filter */}
                    <div className="relative" ref={filterRef}>
                        <button onClick={() => setFilterOpen(v => !v)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.06]
                                bg-white dark:bg-white/[0.04] text-sm text-gray-600 dark:text-white/60
                                hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all">
                            <activeOpt.icon className="w-3.5 h-3.5 text-gray-400 dark:text-white/30" />
                            <span className="text-xs font-medium">{activeOpt.label}</span>
                            <ChevronDown className={`w-3 h-3 text-gray-400 dark:text-white/25 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                            {filterOpen && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                    className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#13131f]
                                        border border-black/[0.08] dark:border-white/[0.08]
                                        rounded-xl shadow-xl overflow-hidden z-50">
                                    {FILTER_OPTIONS.map(opt => (
                                        <button key={opt.value}
                                            onClick={() => { setFilter(opt.value); setFilterOpen(false); }}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors
                                                ${opt.value === filterField
                                                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                                    : "text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.04]"}`}>
                                            <opt.icon className="w-3.5 h-3.5" />
                                            {opt.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Search */}
                    <div className="relative w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-white/25" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={`Search ${activeOpt.label.toLowerCase()}…`}
                            className="w-full bg-white dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.06]
                                rounded-xl pl-9 pr-8 py-2 text-sm text-gray-700 dark:text-white/70
                                placeholder-gray-400 dark:placeholder-white/20
                                focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-colors" />
                        {search && (
                            <button onClick={() => setSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Refresh */}
                    <button onClick={fetchLogs} disabled={isLoading}
                        className="p-2 rounded-xl border border-black/[0.08] dark:border-white/[0.06]
                            bg-white dark:bg-white/[0.04] text-gray-400 dark:text-white/30
                            hover:text-indigo-500 dark:hover:text-indigo-400
                            hover:border-indigo-300 dark:hover:border-indigo-500/40
                            disabled:opacity-40 transition-all">
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* ── Loading skeleton ── */}
                {isLoading && (
                    <div className="space-y-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-14 rounded-xl bg-white dark:bg-white/[0.02]
                                border border-black/[0.06] dark:border-white/[0.05] animate-pulse" />
                        ))}
                    </div>
                )}

                {/* ── Log table ── */}
                {!isLoading && logs.length > 0 && (
                    <div className="bg-white dark:bg-white/[0.02] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl overflow-hidden">
                        {/* Column headers */}
                        <div className="grid grid-cols-[1fr_1.2fr_1fr_1.4fr_90px] gap-4 px-4 py-2.5
                            border-b border-black/[0.06] dark:border-white/[0.06]
                            bg-gray-50/80 dark:bg-white/[0.02]">
                            {[
                                { label: "Name", icon: User },
                                { label: "Email", icon: Mail },
                                { label: "Function", icon: Zap },
                                { label: "URL Path", icon: Link2 },
                                { label: "Time", icon: Clock },
                            ].map(({ label, icon: Icon }) => (
                                <div key={label} className="flex items-center gap-1.5">
                                    <Icon className="w-3 h-3 text-gray-300 dark:text-white/20" />
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-white/25">
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <AnimatePresence initial={false}>
                            {logs.map((log, i) => (
                                <motion.div key={log.id}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(i * 0.015, 0.25) }}
                                    className="grid grid-cols-[1fr_1.2fr_1fr_1.4fr_90px] gap-4 px-4 py-3
                                        border-b border-black/[0.04] dark:border-white/[0.04] last:border-0
                                        hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors group">

                                    {/* Name */}
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600
                                            flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                                            {log.userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                        </div>
                                        <span className="text-xs font-medium text-gray-700 dark:text-white/70 truncate">
                                            {log.userName}
                                        </span>
                                    </div>

                                    {/* Email */}
                                    <span className="text-xs text-gray-500 dark:text-white/40 truncate self-center">
                                        {log.userEmail}
                                    </span>

                                    {/* Function badge */}
                                    <div className="self-center">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${fnColor(log.function)}`}>
                                            <Zap className="w-2.5 h-2.5 flex-shrink-0" />
                                            <span className="truncate">{log.function}</span>
                                        </span>
                                    </div>

                                    {/* URL path */}
                                    <span className="text-[11px] font-mono text-gray-400 dark:text-white/35 truncate self-center">
                                        {log.urlPath}
                                    </span>

                                    {/* Timestamp */}
                                    <div className="flex flex-col items-end justify-center">
                                        <span className="text-[11px] text-gray-500 dark:text-white/40 whitespace-nowrap">
                                            {timeAgo(log.created)}
                                        </span>
                                        <span className="text-[9px] text-gray-300 dark:text-white/20 whitespace-nowrap hidden group-hover:block">
                                            {fullDate(log.created)}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* ── Empty state ── */}
                {!isLoading && logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/[0.03]
                            border border-black/[0.07] dark:border-white/[0.06]
                            flex items-center justify-center mb-4">
                            <Activity className="w-6 h-6 text-gray-300 dark:text-white/20" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-white/40">
                            {debouncedSearch ? "No logs match your search" : "No activity logged yet"}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-white/25 mt-1">
                            {debouncedSearch ? "Try a different query or change the filter" : "Logs will appear here once actions are performed"}
                        </p>
                        {debouncedSearch && (
                            <button onClick={() => setSearch("")}
                                className="mt-4 text-xs text-indigo-500 dark:text-indigo-400 hover:underline">
                                Clear search
                            </button>
                        )}
                    </div>
                )}

                {/* ── Pagination ── */}
                {!isLoading && (hasMore || page > 1) && (
                    <div className="flex items-center justify-between mt-4">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.06]
                                bg-white dark:bg-white/[0.03] text-xs font-medium text-gray-600 dark:text-white/50
                                hover:border-indigo-300 dark:hover:border-indigo-500/40
                                disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            <ChevronLeft className="w-3.5 h-3.5" /> Previous
                        </button>

                        <span className="text-xs text-gray-400 dark:text-white/30">Page {page}</span>

                        <button onClick={() => setPage(p => p + 1)} disabled={!hasMore}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.06]
                                bg-white dark:bg-white/[0.03] text-xs font-medium text-gray-600 dark:text-white/50
                                hover:border-indigo-300 dark:hover:border-indigo-500/40
                                disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            Next <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}