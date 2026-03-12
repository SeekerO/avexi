'use client'

import { useEffect, ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../Chat/AuthContext';
import { navItems, type NavItem, type PageId } from '@/lib/types/adminTypes';

interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

type UserRole = 'admin' | 'standard';

// Pages that bypass all checks
const ALWAYS_ACCESSIBLE = ['/login', '/dashboard', '/', '/not-found'];

const AuthGuard = ({ children, redirectTo = '/login' }: AuthGuardProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset access check ONLY when path or user changes — but never on /not-found
  useEffect(() => {
    if (pathname === '/not-found') return;
    setAccessChecked(false);
  }, [pathname, user?.uid]);

  const getAccessibleHrefs = (allowedPages: PageId[] | null): string[] => {
    if (allowedPages === null) {
      const allHrefs: string[] = [];
      const extractHrefs = (items: NavItem[]) => {
        items.forEach(item => {
          if (item.href && item.href !== '') allHrefs.push(item.href);
          if (item.sublinks?.length) extractHrefs(item.sublinks);
        });
      };
      extractHrefs(navItems);
      return allHrefs;
    }
    if (!allowedPages?.length) return [];
    const allowedHrefs: string[] = [];
    const extractAllowedHrefs = (items: NavItem[]) => {
      items.forEach(item => {
        if (item.pagePermissionId && allowedPages.includes(item.pagePermissionId as PageId)) {
          if (item.href && item.href !== '') allowedHrefs.push(item.href);
        }
        if (item.sublinks?.length) extractAllowedHrefs(item.sublinks);
      });
    };
    extractAllowedHrefs(navItems);
    return allowedHrefs;
  };

  const hasAccessToPath = (currentPath: string, allowedHrefs: string[]): boolean => {
    if (ALWAYS_ACCESSIBLE.includes(currentPath)) return true;
    return allowedHrefs.some(href =>
      currentPath === href || currentPath.startsWith(href + '/')
    );
  };

  // ── Main access check ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMounted || accessChecked) return;

    // Step 1 — bypass checks for special pages
    if (ALWAYS_ACCESSIBLE.includes(pathname) && pathname !== '/login') {
      setAccessChecked(true);
      return;
    }

    // Step 2 — check authentication
    if (!user) {
      sessionStorage.setItem('redirectAfterLogin', pathname);
      setAccessChecked(true);
      router.replace('/login');
      return;
    }

    // Step 3 — check canChat permission
    if (!user.canChat) {
      setAccessChecked(true);
      router.replace('/');
      return;
    }

    // Step 4 — resolve allowed pages
    const userRole: UserRole = user.isAdmin ? 'admin' : 'standard';
    const allowedPages: PageId[] | null = userRole === 'admin'
      ? null
      : (user.allowedPages as PageId[] ?? []);

    const accessibleHrefs = getAccessibleHrefs(allowedPages);

    // Step 5 — handle login page redirect
    if (pathname === '/login') {
      const savedPath = sessionStorage.getItem('redirectAfterLogin');
      sessionStorage.removeItem('redirectAfterLogin');
      const destination = savedPath && savedPath !== '/login' && hasAccessToPath(savedPath, accessibleHrefs)
        ? savedPath
        : accessibleHrefs[0] ?? '/dashboard';
      setAccessChecked(true);
      router.replace(destination);
      return;
    }

    // Step 6 — check if page exists/is accessible
    if (!hasAccessToPath(pathname, accessibleHrefs)) {
      setAccessChecked(true);
      router.replace('/not-found');
      return;
    }

    // All checks passed
    setAccessChecked(true);

  }, [user, isMounted, pathname, router, accessChecked]);

  // ── Render Control ─────────────────────────────────────────────────────────

  // Always render login and not-found immediately
  if (pathname === '/login' || pathname === '/not-found') {
    return <>{children}</>;
  }

  // Show loading while checking
  if (!isMounted || !accessChecked) {
    return (
      <div className='p-[50px] text-center'>
        <h1>Verifying Access...</h1>
        <p>Please wait...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className='p-[50px] text-center'>
        <h1>Redirecting to login...</h1>
      </div>
    );
  }

  // No canChat
  if (!user.canChat) {
    if (pathname === '/') return <>{children}</>;
    return (
      <div className='p-[50px] text-center'>
        <h1>Access Denied</h1>
        <p>You do not have permission to access this application.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;