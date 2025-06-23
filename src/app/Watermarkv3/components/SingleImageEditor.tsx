// app/components/SingleImageEditor.tsx
"use client";

import React, { RefObject, SetStateAction, useEffect, useRef } from "react";
// Corrected import path for ImageEditorContext
import { useImageEditor } from "./ImageEditorContext";
// Icons for download, delete, and maximize actions
import { MdDelete } from "react-icons/md";
import { FiDownload, FiMaximize2 } from "react-icons/fi";

interface SingleImageEditorProps {
    image: any;
    index: number;
}

interface ModalPreviewProps {
    // Allow canvasRef.current to be null
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    open: boolean;
    onClose: React.Dispatch<SetStateAction<boolean>>;
    // Changed this prop name for clarity as we'll use it to grab the modal's canvas
    modalCanvasId: string;
}

// Helper function to calculate the position of the logo based on its settings.
const calculatePosition = (
    position: string,
    imgWidth: number,
    imgHeight: number,
    logoWidth: number,
    logoHeight: number,
    paddingX: number,
    paddingY: number
): [number, number] => {
    let x = 0;
    let y = 0;

    switch (position) {
        case "top-left":
            x = paddingX;
            y = paddingY;
            break;
        case "top-center":
            x = (imgWidth - logoWidth) / 2;
            y = paddingY;
            break;
        case "top-right":
            x = imgWidth - logoWidth - paddingX;
            y = paddingY;
            break;
        case "bottom-left":
            x = paddingX;
            y = imgHeight - logoHeight - paddingY;
            break;
        case "bottom-center":
            x = (imgWidth - logoWidth) / 2;
            y = imgHeight - logoHeight - paddingY;
            break;
        case "bottom-right":
            x = imgWidth - logoWidth - paddingX;
            y = imgHeight - logoHeight - paddingY;
            break;
        default:
            // Default to top-left if position is not recognized
            x = paddingX;
            y = paddingY;
    }
    return [x, y];
};

export default function SingleImageEditor({ image, index }: SingleImageEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { logo, footer, setImages, setSelectedImageIndex, globalLogoSettings, globalFooterSettings } = useImageEditor();
    const [openPreview, setOpenPreview] = React.useState(false);

    const activeLogoSettings = image.useGlobalSettings ? globalLogoSettings : image.individualLogoSettings;
    const activeFooterSettings = image.useGlobalSettings ? globalFooterSettings : image.individualFooterSettings;

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");

        if (!canvas || !ctx) {
            console.error("Canvas or 2D context not available.");
            return;
        }

        const img = new Image();
        img.src = image.url;
        img.crossOrigin = "anonymous";

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            if (logo && activeLogoSettings) {
                const logoImg = new Image();
                logoImg.src = logo;
                logoImg.crossOrigin = "anonymous";
                logoImg.onload = () => {
                    const { width, height, position, paddingX, paddingY } = activeLogoSettings;
                    const [x, y] = calculatePosition(position, img.width, img.height, width, height, paddingX, paddingY);
                    ctx.drawImage(logoImg, x, y, width, height);
                };
                logoImg.onerror = () => console.error("Error loading logo image.");
            }

            if (footer && activeFooterSettings) {
                const footerImg = new Image();
                footerImg.src = footer;
                footerImg.crossOrigin = "anonymous";
                footerImg.onload = () => {
                    const scale = activeFooterSettings.scale;
                    const offsetX = activeFooterSettings.offsetX;
                    const opacity = activeFooterSettings.opacity;

                    const fWidth = footerImg.naturalWidth * scale;
                    const fHeight = footerImg.naturalHeight * scale;
                    const y = img.height - fHeight;
                    const x = offsetX;

                    ctx.globalAlpha = opacity;
                    ctx.drawImage(footerImg, x, y, fWidth, fHeight);
                    ctx.globalAlpha = 1;
                };
                footerImg.onerror = () => console.error("Error loading footer image.");
            }
        };
        img.onerror = () => console.error("Error loading main image.");
    }, [image, logo, footer, activeLogoSettings, activeFooterSettings]);

    const downloadImage = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
            console.error("Canvas not found for download.");
            return;
        }
        const link = document.createElement("a");
        link.download = `watermarked_image_${index + 1}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    const deleteImage = () => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setSelectedImageIndex(null);
    };

    // Use a unique ID for the canvas element inside the modal
    const modalCanvasId = `modal-canvas-${index}`;

    return (
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 flex flex-col items-center">
            <canvas ref={canvasRef} id={`canvas-${index}`} className="w-full h-auto rounded-md mb-4 shadow-sm" />

            <div className="flex flex-wrap gap-3 justify-center w-full">
                <button
                    onClick={downloadImage}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm transition duration-300 ease-in-out transform hover:scale-105 flex gap-2 items-center"
                >
                    <FiDownload />
                </button>
                <button
                    onClick={deleteImage}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition duration-300 ease-in-out transform hover:scale-105 flex gap-2 items-center"
                >
                    <MdDelete />
                </button>
                <button
                    onClick={() => setOpenPreview(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition duration-300 ease-in-out transform hover:scale-105 flex gap-2 items-center"
                >
                    <FiMaximize2 />
                </button>
            </div>
            {/* Pass the new modalCanvasId to the ModalPreview */}
            <ModalPreview canvasRef={canvasRef} open={openPreview} onClose={setOpenPreview} modalCanvasId={modalCanvasId} />
        </div>
    );
}

const ModalPreview = ({ canvasRef, open, onClose, modalCanvasId }: ModalPreviewProps) => {
    if (!open) return null;

    // Use a local ref for the canvas element *inside* the modal
    const modalCanvasRef = useRef<HTMLCanvasElement>(null);
    const ref = useRef<HTMLDivElement>(null)

    const handleClickOutside = (event: MouseEvent) => {
        // Check if the click target is NOT within the modal's content area
        // event.target as Node is important for TypeScript with .contains()
        if (ref.current && !ref.current.contains(event.target as Node)) {
            onClose(false); // Close the modal
        }
    };

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose(false); // Close the modal
            }
        };

        // Attach the event listener when the component mounts
        window.addEventListener('keydown', handleKeyDown);

        // Clean up the event listener when the component unmounts
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);



    useEffect(() => {
        const originalCanvas = canvasRef.current;
        const modalCanvas = modalCanvasRef.current; // Use the local ref for the modal's canvas

        if (originalCanvas && modalCanvas) {
            const ctx = modalCanvas.getContext('2d');
            if (ctx) {
                // Set modal canvas dimensions to match the original
                modalCanvas.width = originalCanvas.width;
                modalCanvas.height = originalCanvas.height;
                // Draw the content of the original canvas onto the modal's canvas
                ctx.drawImage(originalCanvas, 0, 0);
            }
        }
    }, [open, canvasRef, modalCanvasId]); // Re-run when modal opens or original canvas ref changes

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => onClose(false)}
        >
            <div
                ref={ref}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg relative max-w-5xl w-full max-h-[97vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Assign the local ref to this canvas element */}
                <canvas ref={modalCanvasRef} id={modalCanvasId} className="w-full h-auto rounded-md mb-4 shadow-sm border border-gray-300 dark:border-gray-600" />
            </div>
        </div>
    );
}