// components/AuthGuard.tsx

'use client'

import { useEffect, ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../Chat/AuthContext';

interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

const AuthGuard = ({ children, redirectTo = '/login' }: AuthGuardProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useAuth(); // Add isLoading if available
  const router = useRouter();
  const pathname = usePathname();

  // Component Did Mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auth/Redirection Logic
  useEffect(() => {
    if (!isMounted) {
      return; // Wait until mounted AND auth state is loaded
    }

    const isLoginPage = pathname === redirectTo;

    // Only redirect if user is NOT authenticated AND NOT on login page
    if (!user && !isLoginPage) {
      // Save the current path to return after login
      sessionStorage.setItem('redirectAfterLogin', pathname);
      router.replace(redirectTo);
    }

    // If user just logged in and there's a saved redirect path
    if (user && isLoginPage) {
      const savedPath = sessionStorage.getItem('redirectAfterLogin');
      if (savedPath && savedPath !== redirectTo) {
        sessionStorage.removeItem('redirectAfterLogin');
        router.replace(savedPath);
      }
    }
  }, [user, isMounted, redirectTo, pathname, router]);

  // --- Render Control ---

  // Show loading state while auth is being verified
  if (!isMounted) {
    // If already on login page, render immediately
    if (pathname === redirectTo) {
      return <>{children}</>;
    }

    return (
      <div className='p-[50px] text-center'>
        <h1>Verifying Access...</h1>
        <p>Loading user session...</p>
      </div>
    );
  }

  // If authenticated, always render children (stay on current page)
  if (user) {
    return <>{children}</>;
  }

  // If not authenticated, render children (will redirect if not on login page)
  return <>{children}</>;
};

export default AuthGuard;