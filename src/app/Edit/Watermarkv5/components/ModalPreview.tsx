"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { SetStateAction, useLayoutEffect, useRef, useEffect, useState, useCallback } from "react";
import { useImageEditor } from "./ImageEditorContext";
import { applyPhotoAdjustments } from "../lib/utils/canvasFilters";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, RotateCcw, Sun, Palette, ScanSearch,
    ZoomIn, ZoomOut, Maximize2, SlidersHorizontal,
    ChevronRight, Minimize2
} from "lucide-react";

interface ModalPreviewProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    open: boolean;
    onClose: React.Dispatch<SetStateAction<boolean>>;
    modalCanvasId: string;
    imageIndex: number;
}

interface AdjustmentSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
}

const QuickSlider: React.FC<AdjustmentSliderProps> = ({ label, value, min, max, onChange }) => {
    const percentage = ((value - min) / (max - min)) * 100;
    const isModified = value !== 0;

    return (
        <div className="flex items-center gap-3 group">
            <label className="text-[11px] font-medium text-gray-400 w-[88px] text-right shrink-0 tracking-wide">
                {label}
            </label>
            <div className="relative flex-1 h-[3px] rounded-full bg-white/10">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-75"
                    style={{ width: `${percentage}%` }}
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md border border-white/30 transition-all duration-75 pointer-events-none group-hover:scale-125"
                    style={{ left: `calc(${percentage}% - 6px)` }}
                />
            </div>
            <motion.span
                key={value}
                initial={{ opacity: 0.5, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`text-[11px] font-bold tabular-nums w-9 text-right shrink-0 ${isModified ? "text-sky-400" : "text-gray-500"}`}
            >
                {value > 0 ? `+${value}` : value}
            </motion.span>
        </div>
    );
};

type TabKey = "light" | "color" | "detail";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "light", label: "Light", icon: Sun },
    { key: "color", label: "Color", icon: Palette },
    { key: "detail", label: "Detail", icon: ScanSearch },
];

const ModalPreview = ({
    canvasRef,
    open,
    onClose,
    modalCanvasId,
    imageIndex,
}: ModalPreviewProps): React.JSX.Element | null => {
    const modalCanvasRef = useRef<HTMLCanvasElement>(null);
    const modalContentRef = useRef<HTMLDivElement>(null);
    const originalImageDataRef = useRef<ImageData | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { images, updateIndividualPhotoAdjustments, globalPhotoAdjustments } = useImageEditor();
    const currentImage = images[imageIndex];

    const [showControls, setShowControls] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>("light");

    // Zoom & pan state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [modeConfirmed, setModeConfirmed] = useState(false);
    const isGlobalMode = currentImage?.useGlobalSettings ?? true;
    const slidersLocked = isGlobalMode && !modeConfirmed;
    const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

    const currentAdjustments = currentImage?.photoAdjustments || globalPhotoAdjustments;
    const hasModifications = Object.values(currentAdjustments).some((v) => v !== 0);
    
    const lastPinchDist = useRef<number | null>(null);
    // Copy canvas + store original
    useLayoutEffect(() => {
        const originalCanvas = canvasRef.current;
        const modalCanvas = modalCanvasRef.current;
        if (originalCanvas && modalCanvas) {
            const ctx = modalCanvas.getContext("2d");
            if (ctx) {
                modalCanvas.width = originalCanvas.width;
                modalCanvas.height = originalCanvas.height;
                ctx.drawImage(originalCanvas, 0, 0);
                originalImageDataRef.current = ctx.getImageData(0, 0, modalCanvas.width, modalCanvas.height);
            }
        }
    }, [open, canvasRef]);

    // Apply adjustments on change
    useEffect(() => {
        if (!open) return;
        const modalCanvas = modalCanvasRef.current;
        if (!modalCanvas || !originalImageDataRef.current) return;
        const ctx = modalCanvas.getContext("2d");
        if (!ctx) return;
        ctx.putImageData(originalImageDataRef.current, 0, 0);
        applyPhotoAdjustments(modalCanvas, currentAdjustments);
    }, [currentAdjustments, open]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose(false);
            if (e.key === "=" || e.key === "+") handleZoom("in");
            if (e.key === "-") handleZoom("out");
            if (e.key === "0") resetZoom();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, zoom]);

    // Scroll to zoom
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
       // AFTER
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const rect = el.getBoundingClientRect();
            // Focal point in container coords
            const fx = e.clientX - rect.left - rect.width / 2;
            const fy = e.clientY - rect.top - rect.height / 2;

            setZoom(prevZoom => {
                const newZoom = Math.min(5, Math.max(0.5, prevZoom + delta));
                const ratio = newZoom / prevZoom;
                // Adjust pan so the point under cursor stays fixed
                setPan(prevPan => ({
                    x: fx - ratio * (fx - prevPan.x),
                    y: fy - ratio * (fy - prevPan.y),
                }));
                return newZoom;
            });
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    useEffect(() => {
        if (open) {
            setModeConfirmed(false);
            setZoom(1);
            setPan({ x: 0, y: 0 });
        }
    }, [open, imageIndex]);

    const handleZoom = (dir: "in" | "out") => {
        setZoom((z) => Math.min(5, Math.max(0.5, z + (dir === "in" ? 0.25 : -0.25))));
    };
    const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

    // Pan handlers
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (zoom <= 1) return;
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }, [zoom, pan]);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning) return;
        setPan({
            x: panStart.current.panX + (e.clientX - panStart.current.x),
            y: panStart.current.panY + (e.clientY - panStart.current.y),
        });
    }, [isPanning]);

    const onMouseUp = useCallback(() => setIsPanning(false), []);

    const handleConfirmSwitch = () => {
        updateIndividualPhotoAdjustments({ ...globalPhotoAdjustments });
        setModeConfirmed(true);
    };

    const updateAdjustment = (key: keyof typeof globalPhotoAdjustments, value: number) => {
        if (slidersLocked) return;
        updateIndividualPhotoAdjustments({ [key]: value });
    };
    const resetAdjustments = () => {
        const resetValues: any = {};
        Object.keys(currentAdjustments).forEach((key) => { resetValues[key] = 0; });
        updateIndividualPhotoAdjustments(resetValues);
    };

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastPinchDist.current = Math.hypot(dx, dy);
        } else if (e.touches.length === 1) {
            panStart.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                panX: pan.x,
                panY: pan.y,
            };
        }
    }, [pan]);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 2 && lastPinchDist.current !== null) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const ratio = dist / lastPinchDist.current;
            lastPinchDist.current = dist;

            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const fx = midX - rect.left - rect.width / 2;
            const fy = midY - rect.top - rect.height / 2;

            setZoom(prevZoom => {
                const newZoom = Math.min(5, Math.max(0.5, prevZoom * ratio));
                const scaleRatio = newZoom / prevZoom;
                setPan(prevPan => ({
                    x: fx - scaleRatio * (fx - prevPan.x),
                    y: fy - scaleRatio * (fy - prevPan.y),
                }));
                return newZoom;
            });
        } else if (e.touches.length === 1) {
            setPan({
                x: panStart.current.panX + (e.touches[0].clientX - panStart.current.x),
                y: panStart.current.panY + (e.touches[0].clientY - panStart.current.y),
            });
        }
    }, []);

    const onTouchEnd = useCallback(() => {
        lastPinchDist.current = null;
    }, []);

    if (!open) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex overflow-hidden"
            style={{ background: "radial-gradient(ellipse at center, #0f1117 0%, #060709 100%)" }}
        >
            {/* Canvas Area */}
            <div
          ref={containerRef}
                className="flex-1 relative flex items-center justify-center overflow-hidden"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{ cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default" }}
            >
                {/* Subtle grid background */}
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                    }}
                />

                <motion.canvas
                    ref={modalCanvasRef}
                    id={modalCanvasId}
                    style={{
                        scale: zoom,
                        x: pan.x,
                        y: pan.y,
                        transition: isPanning ? "none" : "scale 0.2s ease",
                    }}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-[0_0_80px_rgba(0,0,0,0.8)]"
                    drag={false}
                />

                {/* Zoom level badge */}
                <AnimatePresence>
                    {zoom !== 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white text-xs font-mono font-bold"
                        >
                            {Math.round(zoom * 100)}%
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10">
                {/* Left: zoom controls */}
                <div className="flex items-center gap-1.5 pointer-events-auto">
                    <ToolButton onClick={() => handleZoom("out")} title="Zoom out (-)">
                        <ZoomOut className="w-4 h-4" />
                    </ToolButton>
                    <button
                        onClick={resetZoom}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-colors border border-white/10"
                        title="Reset zoom (0)"
                    >
                        {Math.round(zoom * 100)}%
                    </button>
                    <ToolButton onClick={() => handleZoom("in")} title="Zoom in (+)">
                        <ZoomIn className="w-4 h-4" />
                    </ToolButton>
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <ToolButton onClick={resetZoom} title="Fit to screen">
                        {zoom === 1 ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </ToolButton>
                </div>

                {/* Right: toggle panel + close */}
                <div className="flex items-center gap-2 pointer-events-auto">
                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => setShowControls((v) => !v)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${showControls
                            ? "bg-sky-500/20 border-sky-500/40 text-sky-300"
                            : "bg-white/10 border-white/10 text-gray-300 hover:bg-white/20"
                            }`}
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Adjustments
                        <motion.div animate={{ rotate: showControls ? 0 : 180 }}>
                            <ChevronRight className="w-3 h-3" />
                        </motion.div>
                    </motion.button>

                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => onClose(false)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-red-500/30 border border-white/10 hover:border-red-500/30 text-gray-300 hover:text-red-400 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>

            {/* Side Panel */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        key="panel"
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        className="w-72 shrink-0 flex flex-col bg-[#0e1014] border-l border-white/[0.06] overflow-hidden z-20"
                    >
                        {/* Panel Header */}
                        <div className="px-5 pt-14 pb-4 border-b border-white/[0.06]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white tracking-wide">
                                    Adjustments
                                </h3>
                                <AnimatePresence>
                                    {hasModifications && (
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={resetAdjustments}
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.07] hover:bg-white/[0.12] text-gray-400 hover:text-white text-[11px] font-medium transition-all border border-white/[0.06]"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Reset
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>

                            {slidersLocked && (
                                <div className="mx-5 mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <p className="text-[11px] text-amber-300 leading-snug mb-2">
                                        Using <strong>Global</strong> settings. Switch to individual to edit this image independently.
                                    </p>
                                    <button
                                        onClick={handleConfirmSwitch}
                                        className="w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[11px] font-bold rounded-lg transition-colors"
                                    >
                                        Switch to Individual
                                    </button>
                                </div>
                            )}

                            {/* Tab Switcher */}
                            <div className="flex gap-1 mt-4 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                                {TABS.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all ${activeTab === tab.key
                                                ? "text-white"
                                                : "text-gray-500 hover:text-gray-300"
                                                }`}
                                        >
                                            {activeTab === tab.key && (
                                                <motion.div
                                                    layoutId="tab-pill"
                                                    className="absolute inset-0 rounded-lg bg-white/[0.1] border border-white/[0.1]"
                                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                />
                                            )}
                                            <Icon className="w-3.5 h-3.5 relative z-10" />
                                            <span className="relative z-10">{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sliders */}
                        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.18 }}
                                    className="space-y-5"
                                >
                                    {activeTab === "light" && <>
                                        <SliderGroup label="Exposure" value={currentAdjustments.exposure} min={-100} max={100} onChange={(v) => updateAdjustment("exposure", v)} disabled={slidersLocked}/>
                                        <SliderGroup label="Brilliance" value={currentAdjustments.brilliance} min={-100} max={100} onChange={(v) => updateAdjustment("brilliance", v)} disabled={slidersLocked}/>
                                        <SliderGroup label="Highlights" value={currentAdjustments.highlights} min={-100} max={100} onChange={(v) => updateAdjustment("highlights", v)} disabled={slidersLocked}/>
                                        <SliderGroup label="Shadows" value={currentAdjustments.shadows} min={-100} max={100} onChange={(v) => updateAdjustment("shadows", v)} disabled={slidersLocked}/>
                                        <SliderGroup label="Contrast" value={currentAdjustments.contrast} min={-100} max={100} onChange={(v) => updateAdjustment("contrast", v)} disabled={slidersLocked}/>
                                        <SliderGroup label="Brightness" value={currentAdjustments.brightness} min={-100} max={100} onChange={(v) => updateAdjustment("brightness", v)} disabled={slidersLocked}/>
                                        <SliderGroup label="Black Point" value={currentAdjustments.blackPoint} min={0} max={100} onChange={(v) => updateAdjustment("blackPoint", v)} />
                                    </>}
                                    {activeTab === "color" && <>
                                        <SliderGroup label="Saturation" value={currentAdjustments.saturation} min={-100} max={100} onChange={(v) => updateAdjustment("saturation", v)} disabled={slidersLocked} />
                                        <SliderGroup label="Vibrance" value={currentAdjustments.vibrance} min={-100} max={100} onChange={(v) => updateAdjustment("vibrance", v)} disabled={slidersLocked} />
                                        <SliderGroup label="Warmth" value={currentAdjustments.warmth} min={-100} max={100} onChange={(v) => updateAdjustment("warmth", v)} disabled={slidersLocked} />
                                        <SliderGroup label="Tint" value={currentAdjustments.tint} min={-100} max={100} onChange={(v) => updateAdjustment("tint", v)} disabled={slidersLocked} />
                                    </>}
                                    {activeTab === "detail" && <>
                                        <SliderGroup label="Sharpness" value={currentAdjustments.sharpness} min={0} max={100} onChange={(v) => updateAdjustment("sharpness", v)} disabled={slidersLocked} />
                                        <SliderGroup label="Definition" value={currentAdjustments.definition} min={0} max={100} onChange={(v) => updateAdjustment("definition", v)} disabled={slidersLocked} />
                                        <SliderGroup label="Noise Reduction" value={currentAdjustments.noiseReduction} min={0} max={100} onChange={(v) => updateAdjustment("noiseReduction", v)} disabled={slidersLocked} />
                                        <SliderGroup label="Vignette" value={currentAdjustments.vignette} min={0} max={100} onChange={(v) => updateAdjustment("vignette", v)} disabled={slidersLocked} />
                                    </>}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-4 border-t border-white/[0.06]">
                            <div className="flex items-center gap-2 text-[10px] text-gray-600">
                                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] font-mono">scroll</span>
                                <span>to zoom</span>
                                <span className="mx-1 opacity-40">·</span>
                                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] font-mono">drag</span>
                                <span>to pan</span>
                                <span className="mx-1 opacity-40">·</span>
                                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] font-mono">0</span>
                                <span>to reset</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ─── Reusable slider with label ──────────────────────────────────────────────
function SliderGroup({ label, value, min, max, onChange, disabled = false }: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
    disabled?: boolean;
}) {
    const percentage = ((value - min) / (max - min)) * 100;
    const isModified = value !== 0;
    return (
        <div className="group space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-400 tracking-wide">{label}</span>
                <motion.span
                    key={value}
                    initial={{ scale: 0.85, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded ${isModified
                        ? "text-sky-400 bg-sky-500/10"
                        : "text-gray-600 bg-white/[0.04]"
                        }`}
                >
                    {value > 0 ? `+${value}` : value}
                </motion.span>
            </div>
            <div className="relative h-[3px] rounded-full bg-white/[0.08] group-hover:bg-white/[0.12] transition-colors">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-500 to-blue-400 transition-all duration-75"
                    style={{ width: `${percentage}%` }}
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg border border-sky-400/30 scale-0 group-hover:scale-100 transition-transform duration-150 pointer-events-none"
                    style={{ left: `calc(${percentage}% - 7px)` }}
                />
            </div>
        </div>
    );
}

// ─── Icon button ─────────────────────────────────────────────────────────────
function ToolButton({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
    return (
        <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClick}
            title={title}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all border border-white/10"
        >
            {children}
        </motion.button>
    );
}

export default ModalPreview;