// components/Wrapper.tsx
"use client"
import React from 'react';
import DarkModeToggle from '@/lib/components/dark-button';
import PopupChat from '../Chat/PopupChat';

interface WrapperProps {
    children: React.ReactNode;
}

const ThemeWrapper: React.FC<WrapperProps> = ({ children }) => {
    return (
        <div>
            <div className="fixed right-4 top-4">
                <DarkModeToggle />
            </div>
            {children}
            <div className='absolute bottom-5 right-5 z-50'>
                {/* <ChatHead /> */}
                <PopupChat />
            </div>
        </div>
    );
};

export default ThemeWrapper;
