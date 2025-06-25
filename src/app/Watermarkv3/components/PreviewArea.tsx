// app/components/PreviewArea.tsx
"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useRef } from "react";
import JSZip from "jszip"; // Import JSZip
import { saveAs } from 'file-saver'; // For saving the generated zip file
import { useImageEditor } from "./ImageEditorContext";
import SingleImageEditor from "./SingleImageEditor";
import ModalLoading from "./ModalLoading";
import { HiOutlineFolderDownload } from "react-icons/hi";
import { IoImage } from "react-icons/io5";

export default function PreviewArea() {
    // Destructure necessary values from the image editor context.
    const { images, selectedImageIndex, setSelectedImageIndex } = useImageEditor();
    const [processing, setProcessing] = useState<boolean>(false);
    const [downloadProgress, setDownloadProgress] = useState<number>(0);

    // Use useRef to store the AbortController instance across renders
    const abortControllerRef = useRef<AbortController | null>(null);


    // Function to download all processed images as a ZIP file.
    const downloadAll = async () => {
        if (images.length === 0) return;

        setProcessing(true);
        setDownloadProgress(0);

        // Initialize a new AbortController for this download session
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const zip = new JSZip();
        const folder = zip.folder("watermarked_images");

        try {
            for (const [index] of images.entries()) {
                // Immediately check for cancellation signal before processing each image
                if (signal.aborted) {
                    console.log("Download cancelled during image processing loop (Aborted signal).");
                    return; // Exit the function immediately
                }

                const canvas = document.getElementById(`canvas-${index}`) as HTMLCanvasElement;
                if (canvas) {
                    // Get image data as a Blob
                    // Note: canvas.toBlob cannot be directly aborted, but we check signal after it completes.
                    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

                    // Crucial: Check signal *after* blob creation (if it took time)
                    if (signal.aborted) {
                        console.log("Download cancelled after blob creation (Aborted signal).");
                        return; // Exit if cancelled while blob was being created
                    }

                    if (blob) {
                        folder?.file(`watermarked_image_${index + 1}.png`, blob); // Add to zip folder
                        setDownloadProgress(prev => prev + 1); // Update progress
                    }
                }
            }

            // Check for cancellation signal before starting zip generation
            if (signal.aborted) {
                console.log("Download cancelled before zip generation (Aborted signal).");
                return; // Exit the function immediately
            }

            // Corrected: Removed `signal: signal` from the options object
            // JSZip does not natively support AbortSignal directly here.
            const content = await zip.generateAsync({ type: "blob" }, (metadata) => {
                console.log("Zip generation progress (JSZip):", metadata.percent);
                // Even though JSZip doesn't support AbortSignal directly,
                // we can still check signal.aborted *within this callback*
                // to decide if we should stop further processing/cleanup *after* generateAsync completes.
                // However, generateAsync itself will still run to completion.
                if (signal.aborted) {
                    console.log("Abort signal detected during JSZip progress callback. Preventing further actions.");
                    // No direct way to stop generateAsync, but we can ensure .then() doesn't proceed.
                }
            });

            // Final check for cancellation after zip generation completes
            if (signal.aborted) {
                console.log("Download cancelled after zip generation, before save (Aborted signal).");
                return; // Don't save if cancelled
            }
            saveAs(content, "watermarked_images.zip");

        } catch (error: any) { // Use 'any' for error to safely check for potential AbortError or others
            // Note: generateAsync will not throw an AbortError from an AbortSignal here
            // because it doesn't natively support it. This catch would be for other errors.
            console.error("Error during download process:", error);
        } finally {
            // Always reset states whether successful, cancelled, or errored
            setProcessing(false);
            setDownloadProgress(0);
            abortControllerRef.current = null; // Clean up the controller reference
        }
    };

    // Function to signal the cancellation
    const cancelDownload = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(); // Trigger the abort signal
            console.log("Abort signal sent.");
        }
        // Immediately update UI for cancellation feedback
        setProcessing(false);
        setDownloadProgress(0);
    };

    return (
        <div className="space-y-6 p-1">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex gap-2">Image Previews
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-slate-900">
                        <IoImage />
                        {images.length}
                    </span>
                </h2>
                {images.length > 0 && (
                    <div className="flex gap-4">
                        <button
                            onClick={downloadAll}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-end gap-2"
                            disabled={images.length === 0 || processing} // Disable button while processing
                        >
                            <HiOutlineFolderDownload className="text-[25px]" /> Download All as ZIP
                        </button>
                    </div>
                )}
            </div>

            {images.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-200 text-lg text-center bg-white dark:bg-gray-800 p-6 rounded-lg shadow-inner">
                    No images uploaded yet. Please use the uploader on the left.
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {images.map((image: any, index: number) => (
                        <div
                            key={index}
                            className={`relative rounded-xl overflow-hidden transition-all duration-200 ease-in-out ${selectedImageIndex === index
                                ? "border-blue-500 shadow-xl scale-102 border-2"
                                : " hover:border-gray-400 cursor-pointer shadow-md"
                                }`}
                            onClick={() => setSelectedImageIndex(index)}
                        >
                            <SingleImageEditor image={image} index={index} />
                            {selectedImageIndex === index && (
                                <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center text-white font-bold text-2xl pointer-events-none rounded-xl">
                                    SELECTED
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {/* Pass progress and totalImages to ModalLoading */}
            <ModalLoading open={processing} cancelProcess={cancelDownload} progress={downloadProgress} totalImages={images.length} />
        </div>
    );
}