"use client";
import React, { useRef, useState, useEffect } from "react"; // <-- FIX 1: Import useEffect
import kkk from "../../lib/image/KKK.png";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Pencil, FileText, CheckCircle, Search, Settings, Menu, ChevronLeft } from "lucide-react";
import { CiLogout } from "react-icons/ci";
import { IoImagesOutline } from "react-icons/io5";
import { IoIosSettings } from "react-icons/io";
import DarkModeToggle from "@/lib/components/dark-button";

const navItems = [
    {
        name: "Edit",
        href: "",
        icon: IoImagesOutline,
        active: false,
        sublinks: [
            { name: "Watermark", href: "/Edit/Watermarkv3", icon: IoImagesOutline, active: true, },
            { name: "BG Remover", href: "/Edit/Backgroundremover", icon: IoImagesOutline, active: true, }
        ]
    },
    {
        name: "Remarks",
        href: "/Remarks",
        icon: Pencil,
        active: true,
        sublinks: [
            { name: "FAQ", href: "/Remarks/Faq", icon: FileText }
        ]
    },
    { name: "Matcher", href: "/Matcher", icon: Search, active: true, sublinks: [] },
    { name: "Evaluation", href: "/Evaluation", icon: Settings, active: true, sublinks: [] },
];

const Sidebar: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const [isSettings, setIsSettings] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    const isActive = (href: string) => pathname === href;

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent): void => {
            // FIX 4: Use the correct ref name (settingsRef)
            if (
                settingsRef.current &&
                !settingsRef.current.contains(event.target as Node)
            ) {
                setIsSettings(false);
            }
        };

        if (isSettings) {
            document.addEventListener("mousedown", handleOutsideClick);
        }

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [isSettings]);

    // --- Tailwind Classes (Now with Theme Logic) ---

    // Base classes for the link structure
    const linkBaseClasses = "flex items-center p-3 rounded-lg text-sm transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden";

    // Active classes: Uses a primary color that works well in both light and dark modes
    const activeClasses = "bg-sky-600 text-white font-semibold shadow-md hover:bg-sky-500";

    // Inactive Main Link classes: Define both base (light) and dark variants
    const inactiveMainClasses = "text-gray-700 font-medium hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white";

    // Inactive Sublink classes: Define both base (light) and dark variants, with adjusted color for hierarchy
    const inactiveSublinkClasses = "text-gray-500 font-light hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white";

    // Sidebar sizing/layout logic
    const sidebarWidthClass = isCollapsed ? 'w-[80px]' : 'w-[250px]';
    const sublinkIndentClass = isCollapsed ? 'justify-center' : 'pl-8 space-x-3';
    const mainLinkSpaceClass = isCollapsed ? 'justify-center' : 'space-x-3';

    // Sidebar root classes: Define both base (light) and dark backgrounds and border
    const sidebarRootClasses = "h-screen shrink-0 shadow-2xl transition-all duration-300 ease-in-out mr-1 " +
        "bg-white text-gray-900 dark:bg-gray-900 dark:text-white";

    const logoBorderClasses = "border-b border-gray-200/50 dark:border-gray-700/50";
    const footerBorderClasses = "border-t border-gray-200/50 dark:border-gray-700/50";

    return (
        <div className={`${sidebarWidthClass} ${sidebarRootClasses} justify-between flex flex-col`}>

            {/* Logo Section */}
            <div className={`w-full flex items-center justify-center py-6 relative ${logoBorderClasses}`}>

                {/* Only show image when expanded */}
                {!isCollapsed && (
                    <Image
                        src={kkk}
                        alt="Application Logo"
                        width={140}
                        height={60}
                        className="object-contain"
                        priority
                    />
                )}

                {/* Toggle Button logic updated */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`rounded-full transition-all duration-300
                                ${isCollapsed
                            ? ' -translate-x-1/2 ml-[30%] '
                            : ' absolute top-10 right-6 p-1 bg-gray-200 dark:bg-gray-700'}`}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? (
                        <Menu className="h-6 w-6 text-gray-900 dark:text-white" />
                    ) : (
                        <ChevronLeft className="h-5 w-5 text-gray-900 dark:text-white" />
                    )}
                </button>
            </div>

            {/* Navigation Links Section */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => (
                    <React.Fragment key={item.name}>
                        {/* Main Link */}
                        <Link
                            href={item.href}
                            className={`${linkBaseClasses} ${mainLinkSpaceClass} ${isActive(item.href) ? activeClasses : item.active ? inactiveMainClasses : ""} `}
                        >
                            <item.icon className="h-5 w-5 shrink-0 opacity-75" />
                            {!isCollapsed && <span>{item.name}</span>}
                        </Link>

                        {/* Sublinks Section (Only render if there are sublinks) */}
                        {item.sublinks.length > 0 && (
                            <div className="space-y-1">
                                {item.sublinks.map((sublink) => (
                                    <Link
                                        key={sublink.name}
                                        href={sublink.href}
                                        className={`${linkBaseClasses} ${sublinkIndentClass} ${isActive(sublink.href) ? activeClasses : inactiveSublinkClasses}`}
                                    >
                                        <sublink.icon className="h-4 w-4 shrink-0 opacity-60" />
                                        {!isCollapsed && <span>{sublink.name}</span>}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </nav>

            {/* Footer Section */}
            <div className={`pt-2 `}>
                {/* Logout Button */}
                <button
                    className={`text-gray-400 dark:text-gray-300 font-medium hover:text-red-500 dark:hover:text-red-400 p-4 flex items-center gap-2 w-full duration-300 ${isCollapsed ? 'justify-center' : 'pl-6'}`}
                    title="Logout"
                >
                    <CiLogout size={23} />
                    {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
                </button>

                {/* Settings Button (and Modal) */}
                <div className={`w-full flex items-center p-4 ${isCollapsed ? 'justify-center' : 'pl-6'}`}>
                    <button
                        onClick={() => setIsSettings(!isSettings)}
                        className="flex items-center gap-2 text-gray-400 dark:text-gray-300 hover:text-sky-500 dark:hover:text-sky-400 duration-300"
                        title="Open Settings"
                        aria-expanded={isSettings} // Accessibility improvement
                    >
                        <IoIosSettings size={20} />
                        {!isCollapsed && <span className="whitespace-nowrap">Settings</span>}
                    </button>

                    {isSettings && (
                        <div className="fixed inset-0 w-screen h-screen justify-center items-center flex backdrop-blur-sm bg-black/30 z-50"> {/* Added z-50 and backdrop color for better modal isolation */}
                            {/* FIX 4: Use the correct ref name (settingsRef) */}
                            <div ref={settingsRef} className="w-[300px] h-[200px] bg-gray-300 dark:bg-gray-800 rounded-lg shadow-2xl p-6 flex flex-col items-center justify-center gap-6">
                                <h1 className="text-gray-900 dark:text-white font-bold text-xl tracking-wide">Theme</h1>
                                <DarkModeToggle />
                            </div>
                        </div>
                    )}
                </div>

                {/* Optional: App Version */}
                {!isCollapsed && (
                    <div className={`${footerBorderClasses} p-4 text-xs text-center text-gray-500`}>
                        <p>App Version 1.0</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;