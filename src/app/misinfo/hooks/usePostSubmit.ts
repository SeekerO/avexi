// ============================================================
// MisinfoTracker — usePostSubmit Hook
// src/hooks/misinfo/usePostSubmit.ts
//
// Orchestrates the full pipeline:
//   1. Extract OG metadata from FB URL
//   2. Send to Llama for analysis
//   3. If riskScore >= threshold → auto-save to Firestore
//   4. If below threshold → return result for manual review
// ============================================================

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthContext"; // ✅ correct Avexi path
import { createPost } from "@/lib/firebase/firebase.actions.firestore/misinfoFirestore";
import { apiFetch } from "@/lib/components/apiFetch";
import type {
  OGMetadata,
  AIAnalysisResult,
  MisinfoCategory,
  CreateFlaggedPostPayload,
} from "@/app/misinfo/types/types";

import { RISK_THRESHOLD } from "@/app/misinfo/types/types";

// ----------------------------------------------------------
// State shape
// ----------------------------------------------------------

export type PipelineStage =
  | "idle"
  | "extracting" // fetching OG metadata
  | "analyzing" // Llama analysis in progress
  | "saving" // writing to Firestore
  | "done"
  | "error";

export interface PostSubmitState {
  stage: PipelineStage;
  metadata: OGMetadata | null;
  analysis: AIAnalysisResult | null;
  savedId: string | null;
  shouldSave: boolean;
  error: string | null;
  warning: string | null;
}

const INITIAL_STATE: PostSubmitState = {
  stage: "idle",
  metadata: null,
  analysis: null,
  savedId: null,
  shouldSave: false,
  error: null,
  warning: null,
};

// ----------------------------------------------------------
// Hook
// ----------------------------------------------------------

export function usePostSubmit() {
  const { user } = useAuth();
  const [state, setState] = useState<PostSubmitState>(INITIAL_STATE);

  // Use a ref-style updater to avoid stale closure issues
  const set = useCallback(
    (patch: Partial<PostSubmitState>) =>
      setState((prev) => ({ ...prev, ...patch })),
    [],
  );

  // --------------------------------------------------------
  // Step 1 — Extract OG metadata
  // --------------------------------------------------------

  const extractMetadata = useCallback(
    async (url: string): Promise<OGMetadata | null> => {
      set({
        stage: "extracting",
        error: null,
        warning: null,
        metadata: null,
        analysis: null,
      });

      try {
        const res = await apiFetch(
          `/api/misinfo/extract?url=${encodeURIComponent(url)}`,
        );
        const data = await res.json();

        if (!res.ok) {
          set({
            stage: "error",
            error: data.error ?? "Failed to extract post metadata.",
          });
          return null;
        }

        if (data.warning) set({ warning: data.warning });
        set({ metadata: data.metadata });
        return data.metadata as OGMetadata;
      } catch {
        set({
          stage: "error",
          error: "Network error during metadata extraction.",
        });
        return null;
      }
    },
    [set],
  );

  // --------------------------------------------------------
  // Step 2 — Analyze with Llama via Groq
  // --------------------------------------------------------

  const analyzePost = useCallback(
    async (
      title: string,
      description: string,
    ): Promise<{ analysis: AIAnalysisResult; shouldSave: boolean } | null> => {
      set({ stage: "analyzing" });

      try {
        const res = await apiFetch("/api/misinfo/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description }),
        });

        const data = await res.json();

        if (!res.ok) {
          set({ stage: "error", error: data.error ?? "AI analysis failed." });
          return null;
        }

        set({ analysis: data.analysis, shouldSave: data.shouldSave });
        return { analysis: data.analysis, shouldSave: data.shouldSave };
      } catch {
        set({ stage: "error", error: "Network error during AI analysis." });
        return null;
      }
    },
    [set],
  );

  // --------------------------------------------------------
  // Step 3 — Save to Firestore
  // --------------------------------------------------------

  const savePost = useCallback(
    async (
      payload: Omit<CreateFlaggedPostPayload, "submittedBy">,
    ): Promise<string | null> => {
      // user.email is always present after Google SSO — safe to assert
      if (!user?.email) {
        set({
          stage: "error",
          error: "You must be logged in to submit a post.",
        });
        return null;
      }

      set({ stage: "saving" });

      try {
        const id = await createPost({
          ...payload,
          submittedBy: user.email,
        });

        set({ stage: "done", savedId: id });
        return id;
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err as Error & { code?: string }).code === "DUPLICATE"
        ) {
          set({
            stage: "error",
            error: "This post URL has already been flagged.",
          });
          return null;
        }
        set({ stage: "error", error: "Failed to save post to database." });
        return null;
      }
    },
    [user, set],
  );

  // --------------------------------------------------------
  // Full pipeline — called by SubmitForm on URL submit
  // --------------------------------------------------------

  const runPipeline = useCallback(
    async (
      url: string,
      category: MisinfoCategory,
      manualPageName?: string, // fallback if OG extraction returns empty
      manualPreview?: string,
    ): Promise<void> => {
      setState(INITIAL_STATE);

      // 1. Extract
      const metadata = await extractMetadata(url);
      const title = metadata?.title || manualPageName || "";
      const description = metadata?.description || manualPreview || "";
      const pageName =
        metadata?.siteName || manualPageName || title || "Unknown Page";
      const thumbUrl = metadata?.image;

      // 2. Analyze — don't bail if OG returned empty, Llama can still score
      const analysisResult = await analyzePost(title, description);
      if (!analysisResult) return;

      const { analysis, shouldSave } = analysisResult;

      // 3. Auto-save only if risk threshold is met
      if (shouldSave) {
        await savePost({
          url,
          pageName,
          postPreview: description,
          thumbnailUrl: thumbUrl,
          category,
          aiAnalysis: analysis,
        });
      } else {
        // Below threshold — surface to verifier for manual decision
        set({ stage: "done" });
      }
    },
    [extractMetadata, analyzePost, savePost, set],
  );

  // --------------------------------------------------------
  // Manual save — verifier overrides the threshold
  // --------------------------------------------------------

  const confirmSave = useCallback(
    async (
      url: string,
      pageName: string,
      postPreview: string,
      category: MisinfoCategory,
      thumbnailUrl?: string,
    ): Promise<string | null> => {
      return savePost({
        url,
        pageName,
        postPreview,
        thumbnailUrl,
        category,
        aiAnalysis: state.analysis ?? undefined,
      });
    },
    [state.analysis, savePost],
  );

  // --------------------------------------------------------
  // Reset
  // --------------------------------------------------------

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return {
    state,
    runPipeline,
    extractMetadata,
    analyzePost,
    confirmSave,
    reset,
    // Convenience flags for UI
    isLoading: ["extracting", "analyzing", "saving"].includes(state.stage),
    isDone: state.stage === "done",
    isError: state.stage === "error",
    meetsThreshold: (state.analysis?.riskScore ?? 0) >= RISK_THRESHOLD,
  };
}
