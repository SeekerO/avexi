"use client"
import React from 'react'
import DarkModeToggle from '@/lib/components/dark-button';
import Sidebar from '../sidebar';
import { useAuth } from '@/app/Chat/AuthContext';
import { usePathname } from 'next/navigation';
import PopupChat from '@/app/Chat/PopupChat';
interface WrapperProps {
    children: React.ReactNode;
}

const ThemeWrapper: React.FC<WrapperProps> = ({ children }) => {
    const pathname = usePathname();
    const { user } = useAuth();

    const userAuthenticated = user && user.canChat !== false;
    const sidebarVisible = pathname !== "/"
    const showSidebar = sidebarVisible && userAuthenticated;

    return (
        <>
            <main className='flex'>
                {/* 4. Use the new showSidebar variable */}
                {showSidebar && <>
                    <Sidebar />
                    <div className='absolute bottom-5 right-5 z-50'>
                        <PopupChat />
                    </div>
                </>}
                {children}
            </main>
            <div className="fixed right-4 top-4">
                <DarkModeToggle />
            </div>
        </>
    );
};

export default ThemeWrapper;