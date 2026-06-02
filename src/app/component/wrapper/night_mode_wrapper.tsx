"use client";
import React, { useLayoutEffect } from "react";
import Sidebar from "../sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { usePathname } from "next/navigation";
import MessageNotification from "../messageNotification";
import IncomingCallToast from "../callNotificationOverlay";
import AiAssistant from "../aiAssistant";
import AdminFloatingToolbar from "../../admin/Adminfloatingtoolbar";

interface WrapperProps {
  children: React.ReactNode;
}

const ThemeWrapper: React.FC<WrapperProps> = ({ children }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const isPublicRoute = pathname === "/" || pathname === "/login";
  const isAuthenticated = user && user.isPermitted !== false;
  const showSidebar = !isPublicRoute && isAuthenticated;

  /* Apply saved theme before first paint to avoid flash */
  useLayoutEffect(() => {
    const root = window.document.documentElement;
    const saved = localStorage.getItem("theme-mode");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const isDark = saved === "dark" || (!saved && prefersDark);
    root.classList.toggle("dark", isDark);
  }, []);

  return (
    <main className="flex h-screen w-screen overflow-hidden font-sans bg-grid">
      {showSidebar && <Sidebar />}

      <MessageNotification />

      {/*
        Both AiAssistant and AdminFloatingToolbar manage their own
        `fixed` positioning (AdminFloatingToolbar via a React portal).
        Render them as direct children of <main> — never wrap them
        together in another positioned div.
      */}

      {isAuthenticated && <AiAssistant />}
      {user?.isAdmin && <AdminFloatingToolbar />}

      <div
        className={[
          "flex w-full overflow-y-auto",
          showSidebar ? "pb-16 lg:pb-0" : "",
        ].join(" ")}
      >
        <IncomingCallToast>{children}</IncomingCallToast>
      </div>
    </main>
  );
};

export default ThemeWrapper;
