"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ref, onValue, update } from "firebase/database";
import {
  Search,
  Users,
  LayoutGrid,
  Globe2,
  Shield,
  Ban,
  MessageSquare,
  Key,
  Zap,
  StickyNote,
  UserPlus,
  X,
  CheckCircle2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/lib/auth/AuthContext";
import { PageId, UserProfile } from "@/lib/types/adminTypes";
import { useUserPresence } from "@/lib/hooks/useUserPresence";

import PermissionsModal from "./component/PermissionsModal";
import UserCard from "./component/UserCard";
import CreditsModal from "./component/creditModal";
import NotesModal from "./component/notesModal";

declare global {
  interface Window {
    THREE: any;
  }
}

// ── Role config ──────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<
  string,
  {
    color: string;
    glow: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    threeColor: number;
  }
> = {
  admin: {
    color: "#7c3aed",
    glow: "rgba(124,58,237,0.35)",
    badgeBg: "rgba(124,58,237,0.15)",
    badgeBorder: "rgba(124,58,237,0.35)",
    badgeText: "#a78bfa",
    threeColor: 0x7c3aed,
  },
  viewer: {
    color: "#334155",
    glow: "rgba(51,65,85,0.2)",
    badgeBg: "rgba(51,65,85,0.15)",
    badgeBorder: "rgba(51,65,85,0.35)",
    badgeText: "#64748b",
    threeColor: 0x334155,
  },
};

function getUserRole(u: UserProfile) {
  return u.isAdmin ? "admin" : "viewer";
}
function getInitials(n: string) {
  return n
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── 3D component ─────────────────────────────────────────────────────────────
interface Net3DProps {
  users: UserProfile[];
  onlineUsers: Record<string, boolean | number>;
  searchTerm: string;
  currentUserId: string;
  onToggleAdmin: (uid: string, cur: boolean) => void;
  onToggleAccess: (uid: string, cur: boolean) => void;
  onOpenPermissions: (u: UserProfile) => void;
  onOpenCredits: (u: UserProfile) => void;
  onOpenNotes: (u: UserProfile) => void;
  formatLastOnline: (ts: number) => string;
}

function NetworkView3D({
  users,
  onlineUsers,
  searchTerm,
  currentUserId,
  onToggleAdmin,
  onToggleAccess,
  onOpenPermissions,
  onOpenCredits,
  onOpenNotes,
  formatLastOnline,
}: Net3DProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef<{
    rotY: number;
    rotX: number;
    velY: number;
    velX: number;
    zoom: number;
    isDown: boolean;
    lastX: number;
    lastY: number;
  }>({
    rotY: 0,
    rotX: 0,
    velY: 0.0025,
    velX: 0,
    zoom: 5.2,
    isDown: false,
    lastX: 0,
    lastY: 0,
  });

  const [threeLoaded, setThreeLoaded] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Refs that the animation loop can read without re-initialising Three
  const searchRef = useRef(searchTerm);
  const usersRef2 = useRef(users);
  const onlineRef = useRef(onlineUsers);
  const nodeLabelEls = useRef<HTMLElement[]>([]);

  useEffect(() => {
    searchRef.current = searchTerm;
  }, [searchTerm]);
  useEffect(() => {
    usersRef2.current = users;
  }, [users]);
  useEffect(() => {
    onlineRef.current = onlineUsers;
  }, [onlineUsers]);

  // Load Three.js
  useEffect(() => {
    if ((window as any).THREE) {
      setThreeLoaded(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = () => setThreeLoaded(true);
    document.head.appendChild(s);
  }, []);

  // Init Three scene — only re-runs when users list changes length
  useEffect(() => {
    if (
      !threeLoaded ||
      !canvasRef.current ||
      !wrapRef.current ||
      !overlayRef.current
    )
      return;
    const THREE = (window as any).THREE;
    const wrap = wrapRef.current;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x080b14, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
    camera.position.set(0, 0, 5.2);

    scene.add(new THREE.AmbientLight(0x7c3aed, 0.15));
    const pLight = new THREE.PointLight(0x7c3aed, 2.5, 20);
    pLight.position.set(0, 0, 4);
    scene.add(pLight);
    const pLight2 = new THREE.PointLight(0x3b82f6, 1.2, 16);
    pLight2.position.set(3, -2, 2);
    scene.add(pLight2);
    const grid = new THREE.GridHelper(14, 28, 0x7c3aed, 0x1e2a40);
    grid.position.y = -2.8;
    grid.material.opacity = 0.12;
    grid.material.transparent = true;
    scene.add(grid);

    // Node 3D positions
    const nodePositions3D = users.map((_, i) => {
      const az =
        (i / users.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
      const el = (Math.random() - 0.5) * 1.1;
      const r = 1.6 + Math.random() * 1.2;
      return new THREE.Vector3(
        r * Math.cos(el) * Math.cos(az),
        r * Math.sin(el),
        r * Math.cos(el) * Math.sin(az),
      );
    });

    // Hub — rendered on the WebGL canvas so depth is automatic
    const hubMat = new THREE.MeshPhongMaterial({
      color: 0x0d1120,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.25,
      shininess: 90,
    });
    const hubMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 32, 32),
      hubMat,
    );
    scene.add(hubMesh);

    const torusMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.7,
    });
    const torusMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.018, 16, 64),
      torusMat,
    );
    scene.add(torusMesh);

    const torusMat2 = new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.3,
    });
    const torusMesh2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.008, 12, 60),
      torusMat2,
    );
    scene.add(torusMesh2);

    // Spokes
    const spokeGroup = new THREE.Group();
    users.forEach((u, i) => {
      const rc = ROLE_CONFIG[getUserRole(u)] || ROLE_CONFIG.viewer;
      const isOnline = onlineUsers[u.uid] === true;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        nodePositions3D[i].clone(),
      ]);
      spokeGroup.add(
        new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color: isOnline ? rc.threeColor : 0x1e2a40,
            transparent: true,
            opacity: isOnline ? 0.32 : 0.55,
          }),
        ),
      );
    });
    scene.add(spokeGroup);

    // Cross links
    const onlineList = users.filter((u) => onlineUsers[u.uid] === true);
    onlineList.forEach((u, i) => {
      const next = onlineList[(i + 2) % onlineList.length];
      if (!next || next.uid === u.uid) return;
      const geo = new THREE.BufferGeometry().setFromPoints([
        nodePositions3D[users.indexOf(u)].clone(),
        nodePositions3D[users.indexOf(next)].clone(),
      ]);
      spokeGroup.add(
        new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color: 0x1e2a40,
            transparent: true,
            opacity: 0.4,
          }),
        ),
      );
    });

    // Packets
    const packetMeshes: { mesh: any; target: any; t: number; speed: number }[] =
      [];
    onlineList.forEach((u) => {
      const rc = ROLE_CONFIG[getUserRole(u)] || ROLE_CONFIG.viewer;
      const mat = new THREE.MeshBasicMaterial({
        color: rc.threeColor,
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), mat);
      mesh.position.set(0, 0, 0);
      spokeGroup.add(mesh);
      packetMeshes.push({
        mesh,
        target: nodePositions3D[users.indexOf(u)].clone(),
        t: Math.random(),
        speed: 0.005 + Math.random() * 0.003,
      });
    });

    // Stars
    const sp = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      sp[i * 3] = (Math.random() - 0.5) * 16;
      sp[i * 3 + 1] = (Math.random() - 0.5) * 12;
      sp[i * 3 + 2] = (Math.random() - 0.5) * 8 - 4;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    scene.add(
      new THREE.Points(
        sg,
        new THREE.PointsMaterial({
          color: 0x475569,
          size: 0.028,
          transparent: true,
          opacity: 0.55,
        }),
      ),
    );

    const pivotGroup = new THREE.Group();
    pivotGroup.add(spokeGroup);
    scene.add(pivotGroup);

    // Controls
    const s = stateRef.current;
    const onMouseDown = (e: MouseEvent) => {
      s.isDown = true;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.velY = 0;
      s.velX = 0;
    };
    const onMouseUp = () => {
      s.isDown = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!s.isDown) return;
      const dx = e.clientX - s.lastX,
        dy = e.clientY - s.lastY;
      s.velY = dx * 0.008;
      s.velX = dy * 0.008;
      s.rotY += dx * 0.008;
      s.rotX += dy * 0.008;
      s.rotX = Math.max(-0.9, Math.min(0.9, s.rotX));
      s.lastX = e.clientX;
      s.lastY = e.clientY;
    };
    const onWheel = (e: WheelEvent) => {
      s.zoom += e.deltaY * 0.005;
      s.zoom = Math.max(3.2, Math.min(8, s.zoom));
    };
    wrap.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    wrap.addEventListener("wheel", onWheel);

    function toScreen(v3: any) {
      const v = v3.clone().project(camera);
      return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, z: v.z };
    }

    // HTML overlays — only node avatars (hub is rendered on canvas)
    const overlay = overlayRef.current!;
    overlay.innerHTML = "";
    nodeLabelEls.current = [];

    users.forEach((u, i) => {
      const rc = ROLE_CONFIG[getUserRole(u)] || ROLE_CONFIG.viewer;
      const isOnline = onlineUsers[u.uid] === true;
      const el = document.createElement("div");
      el.dataset.uid = u.uid;
      el.style.cssText =
        "position:absolute;transform:translate(-50%,-50%);pointer-events:none;display:flex;flex-direction:column;align-items:center;transition:opacity 0.3s;opacity:0;";
      el.innerHTML = `
        <div data-avatar style="width:44px;height:44px;border-radius:50%;background:#0d1120;border:1.5px solid ${rc.color};display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:700;letter-spacing:0.05em;cursor:pointer;pointer-events:auto;transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.2s,opacity 0.3s;position:relative;color:${rc.color};font-family:'JetBrains Mono',monospace;${isOnline ? `box-shadow:0 0 12px ${rc.glow}` : ""}">
          ${isOnline ? `<div style="position:absolute;inset:-7px;border-radius:50%;border:1px solid ${rc.color};opacity:0;animation:pring3d 2.4s ease-out infinite;pointer-events:none;"></div>` : ""}
          ${u.photoURL ? `<img src="${u.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : getInitials(u.displayName)}
          <div style="position:absolute;top:1px;right:1px;width:10px;height:10px;border-radius:50%;border:2px solid #080b14;background:${isOnline ? "#34d399" : "#334155"};${isOnline ? "box-shadow:0 0 5px rgba(52,211,153,0.6)" : ""}"></div>
        </div>
        <div data-name style="font-size:9px;font-weight:600;font-family:'JetBrains Mono',monospace;color:#64748b;margin-top:5px;white-space:nowrap;transition:color 0.2s,opacity 0.3s;">${u.displayName.split(" ")[0]}</div>
      `;
      el.querySelector("[data-avatar]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedUser((prev) => (prev?.uid === u.uid ? null : u));
      });
      overlay.appendChild(el);
      nodeLabelEls.current.push(el);
      setTimeout(
        () => {
          el.style.opacity = "1";
        },
        80 + i * 60,
      );
    });

    // Animation
    let t = 0;
    function animate() {
      animRef.current = requestAnimationFrame(animate);
      t += 0.016;

      if (!s.isDown) {
        s.velY = s.velY * 0.97 + 0.0022 * (1 - s.velY / 0.003);
        s.velX *= 0.96;
        s.rotY += s.velY;
        s.rotX += s.velX;
        s.rotX = Math.max(-0.9, Math.min(0.9, s.rotX));
      }

      pivotGroup.rotation.y = s.rotY;
      pivotGroup.rotation.x = s.rotX;
      hubMesh.rotation.y = s.rotY;
      hubMesh.rotation.x = s.rotX;
      torusMesh.rotation.y = s.rotY;
      torusMesh.rotation.x = s.rotX;
      torusMesh2.rotation.y = s.rotY + t * 0.5;
      torusMesh2.rotation.x = s.rotX;
      camera.position.z = s.zoom;

      const breathe = Math.sin(t * 0.6) * 0.5 + 0.5;
      torusMat.opacity = 0.5 + breathe * 0.3;
      torusMat2.opacity = 0.1 + breathe * 0.25;
      hubMat.emissiveIntensity = 0.18 + breathe * 0.22;
      pLight.intensity = 2.0 + Math.sin(t * 1.2) * 0.8;

      packetMeshes.forEach((p) => {
        p.t += p.speed;
        if (p.t >= 1) p.t -= 1;
        const ease = p.t < 0.5 ? 2 * p.t * p.t : -1 + (4 - 2 * p.t) * p.t;
        p.mesh.position.lerpVectors(new THREE.Vector3(0, 0, 0), p.target, ease);
        p.mesh.material.opacity =
          p.t < 0.08 ? p.t / 0.08 : p.t > 0.88 ? (1 - p.t) / 0.12 : 0.92;
      });

      // Compute hub projected z for comparison
      const hubScreen = toScreen(new THREE.Vector3(0, 0, 0));
      // hub is always at z≈0 in NDC; nodes further back have z > hubScreen.z
      const HUB_Z_FIXED = 10; // fixed CSS z for hub HTML label (if any)

      const term = searchRef.current.toLowerCase().trim();

      usersRef2.current.forEach((u, i) => {
        const local = nodePositions3D[i].clone();
        const cosY = Math.cos(s.rotY),
          sinY = Math.sin(s.rotY);
        const cosX = Math.cos(s.rotX),
          sinX = Math.sin(s.rotX);
        const lx = local.x * cosY + local.z * sinY;
        const lz = -local.x * sinY + local.z * cosY;
        const ly = local.y * cosX - lz * sinX;
        const lz2 = local.y * sinX + lz * cosX;
        const sc = toScreen(new THREE.Vector3(lx, ly, lz2));

        const el = nodeLabelEls.current[i];
        el.style.left = sc.x + "px";
        el.style.top = sc.y + "px";
        const depth = (sc.z + 1) / 2; // 0=far, 1=close
        const scale = 0.78 + depth * 0.44;

        // Depth-correct z-index: compare projected z of node vs hub (hub is at z=0 in NDC)
        // hubScreen.z is the NDC z of the hub centre (near 0). Nodes behind the hub have sc.z > hubScreen.z
        const behindHub = sc.z > hubScreen.z + 0.02;
        const zIdx = behindHub
          ? Math.round(depth * 8) + 1
          : Math.round(depth * 8) + 12;
        el.style.transform = `translate(-50%,-50%) scale(${scale})`;
        el.style.zIndex = String(zIdx);

        // Search filter — dim non-matching nodes
        const matches =
          !term ||
          u.displayName.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term);
        const avatar = el.querySelector("[data-avatar]") as HTMLElement | null;
        const name = el.querySelector("[data-name]") as HTMLElement | null;
        if (avatar) avatar.style.opacity = matches ? "1" : "0.12";
        if (name) name.style.opacity = matches ? "1" : "0.08";
        if (name) name.style.color = matches ? "#64748b" : "#1e2a40";
      });

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      wrap.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      wrap.removeEventListener("wheel", onWheel);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threeLoaded, users.length]);

  const selRole = selectedUser ? getUserRole(selectedUser) : null;
  const selRc = selRole ? ROLE_CONFIG[selRole] || ROLE_CONFIG.viewer : null;
  const selOnline = selectedUser
    ? onlineUsers[selectedUser.uid] === true
    : false;
  const isSelf = selectedUser?.uid === currentUserId;
  const hasNotes = !!selectedUser?.notes?.trim();

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-full bg-[#080b14] overflow-hidden select-none"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@700;800&display=swap');
        @keyframes pring3d  { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(1.9);opacity:0} }
        @keyframes ping3d   { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2.5);opacity:0} }
      `}</style>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Node overlays — z-index managed per-frame */}
      <div
        ref={overlayRef}
        className="absolute inset-0"
        style={{ pointerEvents: "none" }}
      />

      {/* Click-away dismiss */}
      {selectedUser && (
        <div
          className="absolute inset-0 z-[15]"
          onClick={() => setSelectedUser(null)}
        />
      )}

      {/* Selected user action panel */}
      <AnimatePresence>
        {selectedUser && selRc && (
          <motion.div
            key={selectedUser.uid}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-80 z-[20] rounded-2xl overflow-hidden backdrop-blur-xl"
            style={{
              background: "rgba(10,13,22,0.97)",
              border: `1px solid ${selRc.badgeBorder}`,
              boxShadow: `0 0 40px ${selRc.glow}, 0 8px 32px rgba(0,0,0,0.6)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Accent bar */}
            <div
              className="h-0.5 w-full"
              style={{
                background: `linear-gradient(90deg, ${selRc.color}, transparent)`,
              }}
            />

            {/* User info header */}
            <div className="flex items-center gap-3 px-4 pt-3.5 pb-3">
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden"
                style={{
                  background: selRc.badgeBg,
                  border: `1px solid ${selRc.badgeBorder}`,
                  color: selRc.color,
                }}
              >
                {selectedUser.photoURL ? (
                  <img
                    src={selectedUser.photoURL}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                ) : (
                  getInitials(selectedUser.displayName)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontFamily: "'Syne',sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#e2e8f0",
                  }}
                  className="truncate"
                >
                  {selectedUser.displayName}
                </div>
                <div
                  style={{ fontSize: 10, color: "#475569", marginTop: 1 }}
                  className="truncate"
                >
                  {selectedUser.email}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    background: selRc.badgeBg,
                    border: `1px solid ${selRc.badgeBorder}`,
                    color: selRc.badgeText,
                  }}
                >
                  {selRole}
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1 rounded-lg text-gray-600 hover:text-gray-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Status row */}
            <div className="flex items-center gap-3 px-4 pb-3">
              <div className="flex items-center gap-1.5 text-[11px]">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: selOnline ? "#34d399" : "#334155" }}
                />
                <span style={{ color: selOnline ? "#34d399" : "#475569" }}>
                  {selOnline ? "Online" : "Offline"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                {selectedUser.isPermitted ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <X className="w-3 h-3 text-red-400" />
                )}
                <span
                  style={{
                    color: selectedUser.isPermitted ? "#34d399" : "#ef4444",
                  }}
                >
                  {selectedUser.isPermitted ? "Access on" : "Access off"}
                </span>
              </div>
              {selectedUser.isAdmin && (
                <div className="flex items-center gap-1 text-[11px]">
                  <Shield className="w-3 h-3 text-violet-400" />
                  <span style={{ color: "#a78bfa" }}>Admin</span>
                </div>
              )}
            </div>

            <div
              className="h-px mx-4 mb-3"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />

            {/* Notes preview */}
            {hasNotes && (
              <div
                className="mx-4 mb-3 px-2.5 py-2 rounded-lg"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <p
                  className="text-[10px] leading-relaxed line-clamp-2"
                  style={{ color: "#fbbf24" }}
                >
                  {selectedUser.notes}
                </p>
              </div>
            )}

            {/* Action row 1 — Access / Admin */}
            <div className="flex gap-2 px-4 mb-2">
              <button
                onClick={() =>
                  onToggleAccess(selectedUser.uid, selectedUser.isPermitted)
                }
                disabled={isSelf}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold border transition-all disabled:opacity-30"
                style={
                  selectedUser.isPermitted
                    ? {
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        color: "#f87171",
                      }
                    : {
                        background: "rgba(52,211,153,0.08)",
                        border: "1px solid rgba(52,211,153,0.25)",
                        color: "#34d399",
                      }
                }
              >
                {selectedUser.isPermitted ? (
                  <Ban className="w-3 h-3" />
                ) : (
                  <MessageSquare className="w-3 h-3" />
                )}
                {selectedUser.isPermitted ? "Revoke" : "Grant"}
              </button>
              <button
                onClick={() =>
                  onToggleAdmin(selectedUser.uid, selectedUser.isAdmin)
                }
                disabled={isSelf}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold border transition-all disabled:opacity-30"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  color: "#fbbf24",
                }}
              >
                {selectedUser.isAdmin ? (
                  <UserPlus className="w-3 h-3" />
                ) : (
                  <Shield className="w-3 h-3" />
                )}
                {selectedUser.isAdmin ? "Demote" : "Promote"}
              </button>
            </div>

            {/* Action row 2 — Pages / Credits / Notes */}
            <div className="flex gap-2 px-4 pb-4">
              {!selectedUser.isAdmin && (
                <button
                  onClick={() => {
                    onOpenPermissions(selectedUser);
                    setSelectedUser(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold border transition-all"
                  style={{
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.2)",
                    color: "#818cf8",
                  }}
                >
                  <Key className="w-3 h-3" /> Pages
                </button>
              )}
              <button
                onClick={() => {
                  onOpenCredits(selectedUser);
                  setSelectedUser(null);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold border transition-all"
                style={{
                  background: "rgba(99,102,241,0.1)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  color: "#a5b4fc",
                }}
              >
                <Zap className="w-3 h-3" /> Credits
              </button>
              <button
                onClick={() => {
                  onOpenNotes(selectedUser);
                  setSelectedUser(null);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold border transition-all"
                style={
                  hasNotes
                    ? {
                        background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.25)",
                        color: "#fbbf24",
                      }
                    : {
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color: "#475569",
                      }
                }
              >
                <StickyNote className="w-3 h-3" /> Note
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────
type ViewMode = "cards" | "3d";

export default function AdminPanel() {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const [selPermissions, setSelPermissions] = useState<UserProfile | null>(
    null,
  );
  const [selCredits, setSelCredits] = useState<UserProfile | null>(null);
  const [selNotes, setSelNotes] = useState<UserProfile | null>(null);

  const currentUserId = user?.uid ?? "";
  const { onlineUsers, isPresenceLoading, formatLastOnline } =
    useUserPresence();
  const isLoading = isLoadingUsers || isPresenceLoading;

  useEffect(() => {
    const unsub = onValue(ref(db, "users"), (snap) => {
      const data = snap.val();
      setAllUsers(
        data
          ? Object.keys(data).map((uid) => ({
              uid,
              photoURL: data[uid].photoURL || null,
              displayName: data[uid].displayName || "Unnamed",
              email: data[uid].email || "—",
              isAdmin: data[uid].isAdmin || false,
              isPermitted:
                data[uid].isPermitted !== undefined
                  ? data[uid].isPermitted
                  : true,
              allowedPages: data[uid].allowedPages || undefined,
              notes: data[uid].notes || "",
            }))
          : [],
      );
      setIsLoadingUsers(false);
    });
    return unsub;
  }, []);

  const handleToggleAdmin = useCallback(
    async (uid: string, cur: boolean) => {
      if (uid === currentUserId) return;
      await update(ref(db, `users/${uid}`), { isAdmin: !cur });
      await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: uid, isAdmin: !cur }),
      });
    },
    [currentUserId],
  );

  const handleToggleAccess = useCallback(
    async (uid: string, cur: boolean) => {
      if (uid === currentUserId) return;
      await update(ref(db, `users/${uid}`), { isPermitted: !cur });
    },
    [currentUserId],
  );

  const handleSavePermissions = useCallback(
    async (uid: string, pages: PageId[]) => {
      await update(ref(db, `users/${uid}`), { allowedPages: pages });
    },
    [],
  );

  const handleSaveNotes = useCallback(async (uid: string, notes: string) => {
    await update(ref(db, `users/${uid}`), { notes });
  }, []);

  if (!user)
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-[#0f0e17]">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const filteredUsers = allUsers.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const onlineCount = allUsers.filter(
    (u) => onlineUsers[u.uid] === true,
  ).length;
  const adminCount = allUsers.filter((u) => u.isAdmin).length;
  const permittedCount = allUsers.filter((u) => u.isPermitted).length;

  return (
    <>
      <div className="min-h-full w-full bg-gray-50 dark:bg-[#0f0e17] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#0f0e17]/80 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.06] px-6 py-4 flex-shrink-0">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-gray-800 dark:text-white/85">
                  User Management
                </h1>
                <p className="text-[11px] text-gray-400 dark:text-white/30">
                  {allUsers.length} users · {onlineCount} online · {adminCount}{" "}
                  admins
                </p>
              </div>
            </div>

            {/* Search bar — works for both views */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-white/25" />
              <input
                type="text"
                placeholder={
                  viewMode === "3d" ? "Filter nodes…" : "Search users…"
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.06]
                  rounded-xl pl-9 pr-4 py-2 text-sm text-gray-700 dark:text-white/70
                  placeholder-gray-400 dark:placeholder-white/20
                  focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-colors"
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.07]">
              {(["cards", "3d"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewMode === mode
                      ? "bg-white dark:bg-white/[0.1] text-gray-800 dark:text-white/85 shadow-sm"
                      : "text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60"
                  }`}
                >
                  {mode === "cards" ? (
                    <LayoutGrid className="w-3.5 h-3.5" />
                  ) : (
                    <Globe2 className="w-3.5 h-3.5" />
                  )}
                  {mode === "cards" ? "Cards" : "3D"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`flex-1 ${viewMode === "3d" ? "overflow-hidden" : "overflow-y-auto"}`}
        >
          {viewMode === "3d" ? (
            <div className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full bg-[#080b14]">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <NetworkView3D
                  users={allUsers}
                  onlineUsers={onlineUsers}
                  searchTerm={searchTerm}
                  currentUserId={currentUserId}
                  onToggleAdmin={handleToggleAdmin}
                  onToggleAccess={handleToggleAccess}
                  onOpenPermissions={setSelPermissions}
                  onOpenCredits={setSelCredits}
                  onOpenNotes={setSelNotes}
                  formatLastOnline={formatLastOnline}
                />
              )}
            </div>
          ) : (
            <div className="max-w-6xl mx-auto px-6 py-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  {
                    label: "Total users",
                    value: allUsers.length,
                    color: "text-gray-800 dark:text-white/80",
                  },
                  {
                    label: "Online now",
                    value: onlineCount,
                    color: "text-emerald-600 dark:text-emerald-400",
                  },
                  {
                    label: "Admins",
                    value: adminCount,
                    color: "text-indigo-600 dark:text-indigo-400",
                  },
                  {
                    label: "Access on",
                    value: permittedCount,
                    color: "text-amber-600 dark:text-amber-400",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="bg-white dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-xl p-4"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-gray-400 dark:text-white/25 mb-1.5">
                      {label}
                    </p>
                    <p
                      className={`text-2xl font-semibold tracking-tight ${color}`}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {isLoading && (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!isLoading && (
                <>
                  {searchTerm && (
                    <div className="flex items-center gap-2 mb-4">
                      <p className="text-xs text-gray-400 dark:text-white/30">
                        {filteredUsers.length} result
                        {filteredUsers.length !== 1 ? "s" : ""} for "
                        {searchTerm}"
                      </p>
                      <button
                        onClick={() => setSearchTerm("")}
                        className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  <AnimatePresence mode="popLayout">
                    {filteredUsers.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-20">
                        {filteredUsers.map((u) => (
                          <UserCard
                            key={u.uid}
                            user={u}
                            isOnline={onlineUsers[u.uid] === true}
                            lastOnlineTimestamp={
                              typeof onlineUsers[u.uid] === "number"
                                ? (onlineUsers[u.uid] as number)
                                : null
                            }
                            currentUserId={currentUserId}
                            handleToggleCanChat={handleToggleAccess}
                            handleToggleAdmin={handleToggleAdmin}
                            handleOpenPermissions={setSelPermissions}
                            handleOpenCredits={setSelCredits}
                            handleOpenNotes={setSelNotes}
                            formatLastOnline={formatLastOnline}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.06] flex items-center justify-center mb-4">
                          <Search className="w-6 h-6 text-gray-300 dark:text-white/20" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-white/40">
                          No users match your search
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {selPermissions && (
        <PermissionsModal
          user={selPermissions}
          onClose={() => setSelPermissions(null)}
          onSave={handleSavePermissions}
        />
      )}
      {selCredits && (
        <CreditsModal user={selCredits} onClose={() => setSelCredits(null)} />
      )}
      {selNotes && (
        <NotesModal
          user={selNotes}
          onClose={() => setSelNotes(null)}
          onSave={handleSaveNotes}
        />
      )}
    </>
  );
}
