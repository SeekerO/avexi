// components/Wrapper.tsx
"use client"
import React from 'react';
import DarkModeToggle from '@/lib/components/dark-button';

interface WrapperProps {
    children: React.ReactNode;
}



const ThemeWrapper: React.FC<WrapperProps> = ({ children }) => {

    return (
        <>
            <div className="fixed right-4 top-4">
                <DarkModeToggle />
            </div>

            {children}

        </>
    );
};

export default ThemeWrapper;
