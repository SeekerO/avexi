"use client"

import { useLayoutEffect, useState, Dispatch, SetStateAction } from 'react';
import { DarkModeSwitch } from 'react-toggle-dark-mode';

interface ToggleThemeProps {
    isDark: boolean;
    setIsDark: Dispatch<SetStateAction<boolean>>;
}

export const toggleTheme = ({ isDark, setIsDark }: ToggleThemeProps) => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    if (isDark) {
        root.classList.remove('dark');
        localStorage.setItem("theme-mode", "light");
    } else {
        root.classList.add('dark');
        localStorage.setItem("theme-mode", "dark");
    }
    setIsDark(!isDark);
};

export default function DarkModeToggle() {
    const [isDark, setIsDark] = useState(false);

    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;

        const root = window.document.documentElement;
        const savedTheme = localStorage.getItem("theme-mode");

        const isDarkInitial = savedTheme === "dark" ||
            (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDarkInitial) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        setIsDark(isDarkInitial);
    }, []);

    return (
        <DarkModeSwitch
            // style={{ marginBottom: '2rem' }}
            checked={isDark}
            onChange={toggleTheme.bind(null, { isDark, setIsDark })}
            size={20}
        />
    );
}