"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useImageEditor } from "./ImageEditorContext";
import SingleImageEditor from "./SingleImageEditor";
import ModalLoading from "./ModalLoading";
import ExportOptionsPanel, { defaultExportOptions } from "./ExportOptionsPanel";
import { exportAsZip } from "../lib/utils/export";
import { ExportOptions } from "../lib/types/watermark";
import { HiOutlineFolderDownload } from "react-icons/hi";
import { IoImage } from "react-icons/io5";
import { Settings2, ChevronDown, ChevronUp, LayoutGrid, Grid2x2, Rows3 } from "lucide-react";
import { useTemplateActions } from "./hooks/useTemplateActions";
import BatchActions from "./BatchActions";
import { useImageKeyNav } from "./hooks/useImageKeyNav";

type GridSize = 1 | 2 | 3;

export default function PreviewArea() {
    const {
        images,
        selectedImageIndex,
        setSelectedImageIndex,
        reorderImages,
        selectedImages
    } = useImageEditor();

    const [processing, setProcessing] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [fileName, setFileName] = useState("watermarked_images");
    const [exportOptions, setExportOptions] = useState<ExportOptions>(defaultExportOptions);
    const [showExportPanel, setShowExportPanel] = useState(false);
    const [gridSize, setGridSize] = useState<GridSize>(3);

    // Drag state — tracked in refs to avoid re-renders mid-drag
    const dragFromIndex = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    useImageKeyNav(images.length, selectedImageIndex, setSelectedImageIndex, gridSize);

    const abortControllerRef = useRef<AbortController | null>(null);
    const imageBlobGetters = useRef<Map<number, () => Promise<Blob | null>>>(new Map());
    const imageCanvases = useRef<Map<number, HTMLCanvasElement>>(new Map());
    const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())

    const { saveTemplate } = useTemplateActions();
    ;
    useEffect(() => {
        if (selectedImageIndex === null) return;
        const card = cardRefs.current.get(selectedImageIndex);
        if (!card) return;
        card.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
        });
    }, [selectedImageIndex]);

    const handleCanvasReady = useCallback((
        index: number,
        getBlobFunc: () => Promise<Blob | null>,
        canvas: HTMLCanvasElement
    ) => {
        imageBlobGetters.current.set(index, getBlobFunc);
        imageCanvases.current.set(index, canvas);
    }, []);

    // ── Drag handlers ─────────────────────────────────────────────────────────

    const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
        dragFromIndex.current = index;
        e.dataTransfer.effectAllowed = "move";
        // Ghost image — use the canvas itself
        const canvas = imageCanvases.current.get(index);
        if (canvas) {
            e.dataTransfer.setDragImage(canvas, canvas.offsetWidth / 2, 40);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex(index);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
        e.preventDefault();
        if (dragFromIndex.current !== null && dragFromIndex.current !== toIndex) {
            reorderImages(dragFromIndex.current, toIndex);
        }
        dragFromIndex.current = null;
        setDragOverIndex(null);
    }, [reorderImages]);

    const handleDragEnd = useCallback(() => {
        dragFromIndex.current = null;
        setDragOverIndex(null);
    }, []);

    // ── Download ──────────────────────────────────────────────────────────────

    const downloadAll = async () => {
        saveTemplate();
        if (images.length === 0) return;
        setProcessing(true);
        setDownloadProgress(0);
        abortControllerRef.current = new AbortController();

        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            await exportAsZip(
                imageBlobGetters.current,
                images.map(img => img.file.name),
                fileName.replace(/\./g, ' ') || 'watermarked_images',
                exportOptions,
                imageCanvases.current,
                (current) => setDownloadProgress(current),
                abortControllerRef.current.signal
            );
        } catch (err) {
            console.error("Export error:", err);
        } finally {
            setProcessing(false);
            setDownloadProgress(0);
            abortControllerRef.current = null;
        }
    };

    const downloadSelected = async () => {
        if (selectedImages.length === 0) return;

        // If only one image selected — download as single file, no ZIP
        if (selectedImages.length === 1) {
            const index = selectedImages[0];
            const canvas = imageCanvases.current.get(index);
            const image = images[index];
            if (!canvas || !image) return;

            const mimeType = `image/${exportOptions.format}`;
            const quality = exportOptions.format === 'png' ? 1 : exportOptions.quality / 100;

            // Apply scale if needed
            let exportCanvas = canvas;
            if (exportOptions.scale !== 1) {
                exportCanvas = document.createElement('canvas');
                exportCanvas.width = Math.round(canvas.width * exportOptions.scale);
                exportCanvas.height = Math.round(canvas.height * exportOptions.scale);
                const ctx = exportCanvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);
                }
            }

            exportCanvas.toBlob((blob) => {
                if (!blob) return;
                const baseName = image.file.name.replace(/\.[^/.]+$/, '');
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${baseName}_watermarked.${exportOptions.format}`;
                link.click();
                URL.revokeObjectURL(link.href);
            }, mimeType, quality);

            return;
        }

        // Multiple selected — export as ZIP using only selected indices
        setProcessing(true);
        setDownloadProgress(0);
        abortControllerRef.current = new AbortController();

        try {
            // Build a filtered Map with only selected indices
            const selectedBlobGetters = new Map<number, () => Promise<Blob | null>>();
            const selectedCanvases = new Map<number, HTMLCanvasElement>();

            selectedImages.forEach(index => {
                const getter = imageBlobGetters.current.get(index);
                const canvas = imageCanvases.current.get(index);
                if (getter) selectedBlobGetters.set(index, getter);
                if (canvas) selectedCanvases.set(index, canvas);
            });

            const selectedFilenames = images.map(img => img.file.name);

            await exportAsZip(
                selectedBlobGetters,
                selectedFilenames,
                `${fileName || 'watermarked_images'}_selected`,
                exportOptions,
                selectedCanvases,
                (current) => setDownloadProgress(current),
                abortControllerRef.current.signal,
            );
        } catch (err) {
            console.error('Selected export error:', err);
        } finally {
            setProcessing(false);
            setDownloadProgress(0);
            abortControllerRef.current = null;
        }
    };

    const cancelDownload = () => {
        abortControllerRef.current?.abort();
        setProcessing(false);
        setDownloadProgress(0);
    };

    // ── Click to select (double-click to deselect) ────────────────────────────

    const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastClickedIndexRef = useRef<number | null>(null);

    const handleSelectImage = useCallback((index: number) => {
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
            if (lastClickedIndexRef.current === index) {
                setSelectedImageIndex(null);
                lastClickedIndexRef.current = null;
                return;
            }
        }
        setSelectedImageIndex(index);
        lastClickedIndexRef.current = index;
        clickTimerRef.current = setTimeout(() => {
            clickTimerRef.current = null;
            lastClickedIndexRef.current = null;
        }, 300);
    }, [setSelectedImageIndex]);

    useEffect(() => {
        return () => { if (clickTimerRef.current) clearTimeout(clickTimerRef.current); };
    }, []);

    useEffect(() => {
        const current = new Set(images.map((_, i) => i));
        Array.from(imageBlobGetters.current.keys()).forEach(i => {
            if (!current.has(i)) {
                imageBlobGetters.current.delete(i);
                imageCanvases.current.delete(i);
                cardRefs.current.delete(i);
            }
        });
    }, [images.length]);

    const gridCols: Record<GridSize, string> = {
        1: "grid-cols-1",
        2: "grid-cols-1 sm:grid-cols-2",
        3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    };

    return (
        <div className="space-y-6 p-6 min-h-screen">

            {/* ── Page header ── */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                    Image Previews
                    {images.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            <IoImage size={16} />
                            {selectedImageIndex !== null
                                ? <>{selectedImageIndex + 1} <span className="opacity-50">/</span> {images.length}</>
                                : images.length
                            }
                        </span>
                    )}
                </h2>

                {/* Grid size toggle */}
                {images.length > 0 && (
                    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        {([1, 2, 3] as GridSize[]).map(size => {
                            const Icon = size === 1 ? Rows3 : size === 2 ? Grid2x2 : LayoutGrid;
                            return (
                                <button
                                    key={size}
                                    onClick={() => setGridSize(size)}
                                    title={`${size} column${size !== 1 ? 's' : ''}`}
                                    className={`p-1.5 rounded-md transition-colors ${gridSize === size
                                        ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Sticky download / export bar ── */}
            {images.length > 0 && (
                <div className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-xl shadow-md p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Filename */}
                        <div className="relative flex-1 min-w-[160px]">
                            <input
                                type="text"
                                placeholder="File name"
                                value={fileName}
                                maxLength={256}
                                onChange={(e) => setFileName(e.target.value)}
                                className="w-full px-3 pl-12 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] italic text-gray-400 border-r border-gray-300 pr-1.5">
                                {fileName.length}/256
                            </span>
                        </div>

                        {/* Format + scale badges */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 uppercase">
                                .{exportOptions.format}
                            </span>
                            {exportOptions.scale !== 1 && (
                                <span className="text-xs font-bold px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                    {exportOptions.scale}×
                                </span>
                            )}
                        </div>

                        {/* Export settings toggle */}
                        <button
                            onClick={() => setShowExportPanel(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
                        >
                            <Settings2 className="w-4 h-4" />
                            Export
                            {showExportPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {/* Download */}
                        <button
                            onClick={downloadAll}
                            disabled={processing}
                            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow transition-all hover:scale-105 text-sm"
                        >
                            <HiOutlineFolderDownload className="text-lg" />
                            Download ZIP
                        </button>
                    </div>

                    {showExportPanel && (
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                            <ExportOptionsPanel options={exportOptions} onChange={setExportOptions} />
                        </div>
                    )}
                </div>
            )}

            {/* Batch actions */}
            <BatchActions onDownloadSelected={downloadSelected} />

            {/* ── Image grid ── */}
            {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <IoImage className="text-5xl text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                        No images yet
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Upload images using the panel on the left
                    </p>
                </div>
            ) : (
                <>
                    {/* Drag hint — shown once images exist */}
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                        <span>⠿</span>
                        Drag cards to reorder · Double-click to deselect · ← → arrow keys to navigate
                    </p>

                    <div className={`grid ${gridCols[gridSize]} gap-6`}>
                        {images.map((image, index) => (
                            <div
                                key={index}
                                ref={(el) => {
                                    if (el) cardRefs.current.set(index, el);
                                    else cardRefs.current.delete(index);
                                }}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
                                onClick={() => handleSelectImage(index)}
                                className={`relative rounded-xl overflow-hidden transition-all duration-200 cursor-grab active:cursor-grabbing h-fit
                                    ${selectedImageIndex === index
                                        ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900 shadow-xl"
                                        : "ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-indigo-300 dark:hover:ring-indigo-700 shadow-md hover:shadow-lg"
                                    }
                                    ${dragOverIndex === index && dragFromIndex.current !== index
                                        ? "ring-2 ring-dashed ring-indigo-400 scale-[1.02] bg-indigo-50 dark:bg-indigo-900/20"
                                        : ""
                                    }
                                `}
                            >
                                {/* Drag position indicator — top */}
                                {dragOverIndex === index && dragFromIndex.current !== null && dragFromIndex.current > index && (
                                    <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500 rounded-t-xl z-30" />
                                )}

                                <SingleImageEditor
                                    image={image}
                                    index={index}
                                    onCanvasReady={handleCanvasReady}
                                    exportOptions={exportOptions}
                                />

                                {/* Drag position indicator — bottom */}
                                {dragOverIndex === index && dragFromIndex.current !== null && dragFromIndex.current < index && (
                                    <div className="absolute bottom-0 inset-x-0 h-1 bg-indigo-500 rounded-b-xl z-30" />
                                )}

                                {/* Drag handle badge — top-center, shown on hover */}
                                <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full">
                                        <span className="text-white text-[10px] font-medium">⠿ drag to reorder</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <ModalLoading
                open={processing}
                cancelProcess={cancelDownload}
                progress={downloadProgress}
                totalImages={images.length}
            />
        </div>
    );
}