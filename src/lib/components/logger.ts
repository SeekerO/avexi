/**
 * createLog — fire-and-forget activity logger.
 *
 * Safe to call on every user action. Rapid calls within DEBOUNCE_MS are
 * deduplicated at the API layer (write buffer), so concurrent users do NOT
 * each trigger a separate Firebase write.
 *
 * Usage:
 *   import { createLog } from "@/lib/utils/logger";
 *   await createLog({ userName, userEmail, function: "handleToggleAdmin", urlPath: "/admin/panel" });
 */

export interface CreateLogPayload {
    userName: string;
    userEmail: string;
    function: string;
    urlPath: string;
}

export async function createLog(payload: CreateLogPayload): Promise<void> {
    try {
        await fetch("/api/logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // keepalive: true ensures the request completes even if the user
            // navigates away immediately after the action.
            keepalive: true,
            body: JSON.stringify(payload),
        });
    } catch (err) {
        // Logging must never crash the calling code.
        console.warn("[logger] Failed to write activity log:", err);
    }
}