"use client";

import React, { useRef, useEffect } from "react";
import { useImageEditor } from "./ImageEditorContext";
import SingleImageEditor from "./SingleImageEditor";

interface ConfirmationModalProps {
    open: boolean;
    onClose: (usePrevious: boolean) => void;
    image: any;
}

const ConfirmationModal = ({ open, onClose, image }: ConfirmationModalProps): React.JSX.Element | null => {
    const modalRef = useRef<HTMLDivElement>(null);
    const { globalLogoSettings, globalFooterSettings, globalShadowSettings, globalShadowTarget, logo, footer } = useImageEditor();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open, onClose]);

    if (!open || !image) return null;

    const savedSettings = localStorage.getItem('imageEditorSettings');
    const settings = savedSettings ? JSON.parse(savedSettings) : {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-11/12 md:w-1/2 lg:w-1/3 p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Apply Previous Settings?</h2>
                <p className="text-gray-600 dark:text-gray-300">
                    We've detected previous watermark settings. Do you want to apply them to your new image?
                </p>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    <h3 className="text-lg font-semibold mb-2">Preview:</h3>
                    <SingleImageEditor
                        image={{
                            file: image.file,
                            url: image.url,
                            useGlobalSettings: true,
                            individualLogoSettings: settings.globalLogoSettings,
                            individualFooterSettings: settings.globalFooterSettings,
                            individualShadowSettings: settings.globalShadowSettings,
                            individualLogo: settings.logo,
                            individualFooter: settings.footer,
                        }}
                        index={-1} // Use a dummy index
                        onCanvasReady={() => { }}
                    />
                </div>
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={() => onClose(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                        No, start fresh
                    </button>
                    <button
                        onClick={() => onClose(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                        Yes, use previous
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;