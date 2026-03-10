"use client";

import React, { useState } from "react";
import ImageUploader from "./components/ImageUploader";
import ImageControls from "./components/ImageControls";
import PreviewArea from "./components/PreviewArea";
import BreadCrumb from "../../component/breadcrumb";
import { ImageEditorProvider, useImageEditor } from "./components/ImageEditorContext";
import { MdDelete } from "react-icons/md";
import { useAuth } from "../../Chat/AuthContext";
import { Info, Upload, Layers, SlidersHorizontal, Undo2, Redo2 } from "lucide-react";
import PhotoAdjustments from "./components/PhotoAdjustments";
import { useKeyboardShortcuts } from "./components/hooks/useKeyboardShortcuts";
import { useImageKeyNav } from "./components/hooks/useImageKeyNav";

type TabId = "upload" | "watermark" | "adjust";

function WatermarkPageContent() {
    const {
    images,
    removeAllImages,
    undo,
    redo,
    canUndo,
    canRedo,
    globalLogos,
    globalFooters,
    selectedImageIndex,
    globalPhotoAdjustments,
        
    } = useImageEditor();

    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>("upload");

    useKeyboardShortcuts({
        onUndo: undo,
        onRedo: redo,
    });
    // Badge counts per tab
    const uploadCount = images.length;

    const watermarkCount = globalLogos.length + globalFooters.length;

    const selectedImage = selectedImageIndex !== null ? images[selectedImageIndex] : null;
    const activeAdjustments = selectedImage?.useGlobalSettings
        ? globalPhotoAdjustments
        : (selectedImage?.photoAdjustments || globalPhotoAdjustments);
    const adjustCount = Object.values(activeAdjustments).filter(v => v !== 0).length;

    const TABS: {
        id: TabId;
        label: string;
        icon: React.ElementType;
        count?: number;
        countColor?: string;
    }[] = [
        {
            id: "upload",
            label: "Upload",
            icon: Upload,
            count: uploadCount,
            countColor: "bg-indigo-500",
        },
        {
            id: "watermark",
            label: "Watermark",
            icon: Layers,
            count: watermarkCount || undefined,
            countColor: "bg-purple-500",
        },
        {
            id: "adjust",
            label: "Adjust",
            icon: SlidersHorizontal,
            count: adjustCount || undefined,
            countColor: "bg-amber-500",
        },
    ];

    if (user && (user as any)?.canChat === true)
        return (
            <div className="min-h-screen flex font-sans overflow-hidden w-full">
                {/* ── Left Sidebar ── */}
                <div className="w-[340px] flex-shrink-0 h-screen flex flex-col border-r border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-900">

                    {/* Sidebar top — breadcrumb + title */}
                    <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                        <BreadCrumb />
                        <div className="flex items-center justify-between mt-3">
                            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                Watermark Editor
                            </h1>
                            {images.length > 0 && (
                                <button
                                    onClick={removeAllImages}
                                    title="Remove all images"
                                    className="flex items-center justify-center w-7 h-7 bg-red-100 dark:bg-red-900/30 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all duration-200"
                                >
                                    <MdDelete className="text-sm" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Privacy notice */}
                    <div className="mx-4 mt-3 px-3 py-2 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-snug">
                            <strong>100% Client-Side.</strong> Your images never leave your device.
                        </p>
                    </div>

                    {/* Tab bar */}
                    <div className="flex mt-3 mx-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
                        {TABS.map(({ id, label, icon: Icon, count, countColor }) => {
                            const isActive = activeTab === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => setActiveTab(id)}
                                    className={`relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                        isActive
                                            ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    }`}
                                >
                                    <div className="relative">
                                        <Icon className="w-4 h-4 mb-0.5" />
                                        {/* Badge */}
                                        {count !== undefined && count > 0 && (
                                            <span className={`absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center ${countColor}`}>
                                                {count > 99 ? "99+" : count}
                                            </span>
                                        )}
                                    </div>
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab content — scrollable */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

                        {/* UPLOAD TAB */}
                        {activeTab === "upload" && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <ImageUploader />
                            </div>
                        )}

                        {/* WATERMARK TAB */}
                        {activeTab === "watermark" && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                {watermarkCount === 0 && images.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                                            <Layers className="w-7 h-7 text-purple-500" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            No watermarks yet
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[200px]">
                                            Upload images first, then add logos and footers here.
                                        </p>
                                        <button
                                            onClick={() => setActiveTab("upload")}
                                            className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                                        >
                                            Go to Upload
                                        </button>
                                    </div>
                                ) : watermarkCount === 0 && images.length > 0 ? (
                                    <div className="space-y-4">
                                        {/* Still show controls even if no watermarks added yet */}
                                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                            <p className="text-xs text-purple-700 dark:text-purple-300">
                                                💡 Switch to the <strong>Upload</strong> tab to add logos and footers, then come back here to control their settings.
                                            </p>
                                        </div>
                                        <ImageControls />
                                    </div>
                                ) : (
                                    <ImageControls />
                                )}
                            </div>
                        )}

                        {/* ADJUST TAB */}
                        {activeTab === "adjust" && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                {images.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                                            <SlidersHorizontal className="w-7 h-7 text-amber-500" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            No images to adjust
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[200px]">
                                            Upload some images first to use photo adjustments.
                                        </p>
                                        <button
                                            onClick={() => setActiveTab("upload")}
                                            className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                                        >
                                            Go to Upload
                                        </button>
                                    </div>
                                ) : (
                                    <PhotoAdjustments />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar footer — undo/redo */}
                    {images.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
                            <button
                                onClick={undo}
                                disabled={!canUndo}
                                title="Undo (Ctrl+Z)"
                                className="flex items-center gap-1.5 flex-1 justify-center py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-200"
                            >
                                <Undo2 className="w-3.5 h-3.5" />
                                Undo
                            </button>
                            <button
                                onClick={redo}
                                disabled={!canRedo}
                                title="Redo (Ctrl+Shift+Z)"
                                className="flex items-center gap-1.5 flex-1 justify-center py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-200"
                            >
                                Redo
                                <Redo2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Right Panel ── */}
                <div className="flex-1 overflow-auto h-screen">
                    <PreviewArea />
                </div>
            </div>
        );
}

function WatermarkPage() {
    return (
        <ImageEditorProvider>
            <WatermarkPageContent />
        </ImageEditorProvider>
    );
}

export default WatermarkPage;