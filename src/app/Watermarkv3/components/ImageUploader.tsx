// app/components/ImageUploader.tsx
"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useRef } from "react";
// Corrected import path for ImageEditorContext
import { useImageEditor } from "./ImageEditorContext";

// Icon from react-icons or any other icon library can be used here
import { FaImage } from "react-icons/fa6";

import Logo from "@/lib/image/COMELEC.png"
import Footer from "@/lib/image/FOOTER.png"
import { StaticImageData } from "next/image";

// Component for uploading source images, logos, and footers.
export default function ImageUploader() {
    // Refs for file input elements.
    const imageInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const footerInputRef = useRef<HTMLInputElement>(null);

    // Destructure context functions and states.
    const {
        setImages,
        setLogo,
        setFooter,
        images,
        setSelectedImageIndex,
    } = useImageEditor();

    // Handler for uploading multiple main images.
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        // Map uploaded files to ImageData objects with default settings.
        const fileArray = Array.from(files).map(file => ({
            file,
            url: URL.createObjectURL(file),
            useGlobalSettings: true, // Default to using global settings
            // individualLogoSettings and individualFooterSettings are optional
            // and will only be set if useGlobalSettings is toggled off later.
        }));

        // Add new images to the existing list.
        setImages((prev: any) => {
            const newImages = [...prev, ...fileArray];
            // Select the first newly uploaded image if there are any
            if (fileArray.length > 0) {
                // If no image was selected before, select the first new one.
                // Otherwise, keep the current selection or handle as needed.
                if (images.length === 0) {
                    setSelectedImageIndex(0); // Select the very first image uploaded
                }
            }
            return newImages;
        });
    };

    // Handler for uploading a logo image.
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogo(URL.createObjectURL(file)); // Set the logo URL in context.
        }
    };

    // Handler for uploading a footer image.
    const handleFooterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFooter(URL.createObjectURL(file)); // Set the footer URL in context.
        }
    };

    const handleDefault = async () => { // Make the function async
        try {
            const imageLOGO = (Logo as StaticImageData).src; // Cast to StaticImageData if TypeScript complains
            const imageFOOTER = (Footer as StaticImageData).src

            const responseLOGO = await fetch(imageLOGO);
            const responseFOOTER = await fetch(imageFOOTER)

            if (!responseLOGO.ok || !responseFOOTER.ok) {
                throw new Error(`HTTP error! status: ${responseLOGO.status}`);
            }

            const imageBlobLOGO = await responseLOGO.blob();
            const imageBlobFOOTER = await responseFOOTER.blob()
            setLogo(URL.createObjectURL(imageBlobLOGO));
            setFooter(URL.createObjectURL(imageBlobFOOTER))

        } catch (error) {
            console.error("Error setting default logo:", error);
        }
    };

    return (
        <div className="space-y-6 px-">
            <div className="flex flex-col gap-1 dark:bg-gray-800 bg-white shadow-lg p-4 rounded-lg">
                <label className="font-semibold text-gray-700 dark:text-gray-100 mb-2 flex gap-2 items-center"><FaImage className="text-[20px]" />Upload Main Images</label>
                <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageUpload}
                    multiple // Allow multiple file selection
                    accept="image/*" // Accept only image files
                    className="block w-full text-sm text-gray-500
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-full file:border-0
                               file:text-sm file:font-semibold
                               file:bg-blue-50 file:text-blue-700
                               hover:file:bg-blue-100" // Styled file input
                />
            </div>

            <div className="flex flex-col gap-1 dark:bg-gray-800 bg-white shadow-lg p-4 rounded-lg">
                <label className="font-semibold text-gray-700 dark:text-gray-100 flex gap-2 items-center"><FaImage className="text-[20px]" />Upload Logo (Optional)</label>
                <input
                    type="file"
                    ref={logoInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="block w-full text-sm text-gray-500
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-full file:border-0
                               file:text-sm file:font-semibold
                               file:bg-purple-50 file:text-purple-700
                               hover:file:bg-purple-100"
                />
            </div>

            <div className="flex flex-col gap-1 dark:bg-gray-800 bg-white shadow-lg p-4 rounded-lg">
                <label className="font-semibold text-gray-700 dark:text-gray-100 flex gap-2 items-center"><FaImage className="text-[20px]" />Upload Footer (Optional)</label>
                <input
                    type="file"
                    ref={footerInputRef}
                    onChange={handleFooterUpload}
                    accept="image/*"
                    className="block w-full text-sm text-gray-500
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-full file:border-0
                               file:text-sm file:font-semibold
                               file:bg-green-50 file:text-green-700
                               hover:file:bg-green-100"
                />
            </div>
            <div className="flex justify-center">
                <button onClick={handleDefault} className="hover:bg-opacity-50 bg-yellow-50 text-yellow-800 px-4 py-1 rounded-full cursor-pointer ">COMELEC Footer & Logo</button>
            </div>
        </div>
    );
}

