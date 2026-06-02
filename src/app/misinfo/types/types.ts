// ============================================================
// MisinfoTracker — Type Definitions
// src/lib/misinfo/types.ts
// ============================================================

// ----------------------------------------------------------
// Enums
// ----------------------------------------------------------

export type MisinfoCategory =
  | "election"
  | "health"
  | "government"
  | "scam"
  | "other";

export type PostStatus =
  | "pending" // Saved by AI pipeline, awaiting verifier
  | "under_review" // Verifier is actively fact-checking
  | "confirmed" // Verified as misinformation
  | "reported" // Formally reported to Meta / authorities
  | "taken_down" // Post removed by Meta
  | "dismissed"; // Rejected by verifier (false positive)

// ----------------------------------------------------------
// AI Analysis Result
// Returned by /api/misinfo/analyze (Llama via Groq)
// ----------------------------------------------------------

export interface AIAnalysisResult {
  isElectionRelated: boolean;
  hasVerifiableClaim: boolean;
  extractedClaim: string; // The specific claim Llama identified
  analysis: string; // Llama's fact-check reasoning
  riskScore: number; // 0–100; threshold for auto-save is >= 70
  reasoning: string; // Why this score was assigned
  analyzedAt: Date;
  model: string; // e.g. 'llama-3.3-70b-versatile'
}

// ----------------------------------------------------------
// OG Metadata
// Returned by /api/misinfo/extract (cheerio scraper)
// ----------------------------------------------------------

export interface OGMetadata {
  title: string;
  description: string;
  image?: string;
  url: string;
  siteName?: string;
}

// ----------------------------------------------------------
// Core Data Model
// Stored in Firestore: collection('flaggedPosts')
// ----------------------------------------------------------

export interface FlaggedPost {
  id: string;
  url: string; // Facebook post URL (submitted by user)
  pageName: string; // FB page / account name (from OG or manual)
  postPreview: string; // og:description or manual note
  thumbnailUrl?: string; // og:image if available

  category: MisinfoCategory;
  status: PostStatus;

  // AI pipeline fields (populated on auto-save; null if manually submitted)
  aiAnalysis?: AIAnalysisResult;

  // Verifier fields (populated after manual review)
  reviewedBy?: string; // Verifier email
  reviewedAt?: Date;
  verifierNotes?: string;

  // Submission metadata
  submittedBy: string; // Team member email
  submittedAt: Date;
  notes?: string; // General analyst notes
}

// ----------------------------------------------------------
// API Payloads
// ----------------------------------------------------------

// POST /api/misinfo/posts — create a new flagged post
export interface CreateFlaggedPostPayload {
  url: string;
  pageName: string;
  postPreview: string;
  thumbnailUrl?: string;
  category: MisinfoCategory;
  aiAnalysis?: AIAnalysisResult;
  submittedBy: string;
  notes?: string;
}

// PATCH /api/misinfo/posts/[id] — update status or add notes
export interface UpdateFlaggedPostPayload {
  status?: PostStatus;
  notes?: string;
  reviewedBy?: string;
  verifierNotes?: string;
}

// GET /api/misinfo/posts — query filters
export interface PostFilters {
  status?: PostStatus;
  category?: MisinfoCategory;
  minRiskScore?: number;
  search?: string; // Searches pageName + postPreview
}

// ----------------------------------------------------------
// Risk Score Threshold
// ----------------------------------------------------------

export const RISK_THRESHOLD = 70; // Posts >= this score are auto-saved

// ----------------------------------------------------------
// Display Helpers (used by UI components)
// ----------------------------------------------------------

export const STATUS_LABELS: Record<PostStatus, string> = {
  pending: "Pending",
  under_review: "Under Review",
  confirmed: "Confirmed",
  reported: "Reported",
  taken_down: "Taken Down",
  dismissed: "Dismissed",
};

export const CATEGORY_LABELS: Record<MisinfoCategory, string> = {
  election: "Election",
  health: "Health",
  government: "Government",
  scam: "Scam",
  other: "Other",
};

export const STATUS_COLORS: Record<PostStatus, string> = {
  pending: "yellow",
  under_review: "blue",
  confirmed: "red",
  reported: "orange",
  taken_down: "green",
  dismissed: "gray",
};
