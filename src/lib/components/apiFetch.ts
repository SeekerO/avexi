// ============================================================
// Avexi — Auth-Aware Fetch Utility
// src/lib/apiFetch.ts
//
// Wraps native fetch to automatically attach the current
// Firebase user's ID token as a Bearer token on every request.
// Use this in all client-side API calls instead of raw fetch().
// ============================================================

import { getAuth } from "firebase/auth";

/**
 * Drop-in replacement for fetch() that automatically attaches
 * the current user's Firebase ID token as Authorization header.
 *
 * Usage:
 *   const res = await apiFetch('/api/misinfo/analyze', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(payload),
 *   })
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const auth = getAuth();
  const user = auth.currentUser;

  // Attach ID token if a user is signed in
  let authHeader: Record<string, string> = {};
  if (user) {
    try {
      const token = await user.getIdToken();
      authHeader = { Authorization: `Bearer ${token}` };
    } catch (err) {
      console.warn("[apiFetch] Failed to get ID token:", err);
    }
  }

  return fetch(input, {
    ...init,
    headers: {
      ...authHeader,
      ...(init.headers ?? {}),
    },
  });
}
