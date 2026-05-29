"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  RiAdminFill,
} from "react-icons/ri";
import {
  FolderClock,
  Logs,
  TestTube,
  Package,
  X,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminAction {
  label: string;
  href: string;
  icon: React.ElementType;
  accent: string;
  iconBg: string;
  description: string;
}

// ── Admin actions — mirrors the admin sublinks in navItems ─────────────────────

const ADMIN_ACTIONS: AdminAction[] = [
  {
    label: "Admin Panel",
    href: "/admin/panel",
    icon: RiAdminFill,
    accent: "from-red-500/20 to-rose-600/10",
    iconBg: "bg-red-500/15 border-red-500/25 text-red-400",
    description: "Users & permissions",
  },
  {
    label: "Time Log",
    href: "/admin/timelog",
    icon: FolderClock,
    accent: "from-indigo-500/20 to-violet-600/10",
    iconBg: "bg-indigo-500/15 border-indigo-500/25 text-indigo-400",
    description: "DTR & attendance",
  },
  {
    label: "User Log",
    href: "/admin/log",
    icon: Logs,
    accent: "from-sky-500/20 to-blue-600/10",
    iconBg: "bg-sky-500/15 border-sky-500/25 text-sky-400",
    description: "Activity history",
  },
  {
    label: "Log Book",
    href: "/admin/logbook",
    icon: TestTube,
    accent: "from-amber-500/20 to-orange-600/10",
    iconBg: "bg-amber-500/15 border-amber-500/25 text-amber-400",
    description: "Document logbook",
  },
  {
    label: "Inventory",
    href: "/admin/inventory",
    icon: Package,
    accent: "from-emerald-500/20 to-green-600/10",
    iconBg: "bg-emerald-500/15 border-emerald-500/25 text-emerald-400",
    description: "Property tracking",
  },
];

// ── AdminFloatingToolbar ──────────────────────────────────────────────────────

export default function AdminFloatingToolbar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleNavigate = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  const isActive = (href: string) => pathname?.startsWith(href);
  const anyActive = ADMIN_ACTIONS.some((a) => isActive(a.href));

  return (
    <div
      ref={containerRef}
      className="fixed bottom-24 right-7 z-50 flex flex-col items-end gap-3"
    >
      {/* ── Action list ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex flex-col gap-1.5 w-56"
          >
            {/* Panel header */}
            <div className="flex items-center gap-2 px-3 py-2 mb-0.5">
              <ShieldCheck className="w-3 h-3 text-white/25" />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                Admin Navigation
              </span>
            </div>

            {ADMIN_ACTIONS.map((action, i) => {
              const Icon = action.icon;
              const active = isActive(action.href);

              return (
                <motion.button
                  key={action.href}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 500, damping: 35 }}
                  onClick={() => handleNavigate(action.href)}
                  className={`
                    group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                    border transition-all duration-150 text-left overflow-hidden
                    ${active
                      ? "bg-white/[0.08] border-white/[0.12] shadow-lg shadow-black/20"
                      : "bg-[#0d0d1a]/90 border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]"
                    }
                    backdrop-blur-md
                  `}
                >
                  {/* Gradient sweep on hover */}
                  <div
                    className={`
                      absolute inset-0 bg-gradient-to-r ${action.accent} opacity-0
                      group-hover:opacity-100 transition-opacity duration-200
                    `}
                  />

                  {/* Active indicator */}
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-white/50" />
                  )}

                  {/* Icon */}
                  <div
                    className={`
                      relative flex-shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center
                      transition-transform duration-150 group-hover:scale-105
                      ${active ? "scale-105 shadow-sm shadow-black/20" : ""}
                      ${action.iconBg}
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Text */}
                  <div className="relative flex flex-col min-w-0">
                    <span
                      className={`text-xs font-semibold leading-none truncate transition-colors ${
                        active ? "text-white/90" : "text-white/60 group-hover:text-white/80"
                      }`}
                    >
                      {action.label}
                    </span>
                    <span className="text-[10px] text-white/25 mt-0.5 truncate leading-none">
                      {action.description}
                    </span>
                  </div>

                  {/* Active dot */}
                  {active && (
                    <div className="relative ml-auto w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trigger button ── */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className={`
          relative w-12 h-12 rounded-2xl flex items-center justify-center
          shadow-xl shadow-black/30 transition-all duration-200
          ${open
            ? "bg-white/10 border border-white/15 backdrop-blur-md"
            : anyActive
              ? "bg-gradient-to-br from-red-500/80 to-rose-700/80 border border-red-400/30 backdrop-blur-md"
              : "bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/[0.08] backdrop-blur-md hover:border-white/[0.15]"
          }
        `}
        aria-label="Toggle admin toolbar"
        title="Admin tools"
      >
        {/* Pulse ring when active on an admin page */}
        {anyActive && !open && (
          <span className="absolute inset-0 rounded-2xl animate-ping bg-red-500/20 pointer-events-none" />
        )}

        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5 text-white/70" />
            </motion.span>
          ) : (
            <motion.span
              key="shield"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ShieldCheck
                className={`w-5 h-5 ${anyActive ? "text-white" : "text-white/50"}`}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}