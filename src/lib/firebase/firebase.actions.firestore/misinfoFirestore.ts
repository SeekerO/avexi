// ============================================================
// MisinfoTracker — Firestore Service (client-side)
// src/lib/firebase/firebase.actions.firestore/misinfoFirestore.ts
//
// Follows the same pattern as faqFirestore.ts and logsFirestore.ts
// ============================================================

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  limit,
  type Unsubscribe,
} from "firebase/firestore"
import { app } from "../firebase"
import type {
  FlaggedPost,
  CreateFlaggedPostPayload,
  UpdateFlaggedPostPayload,
  PostFilters,
} from "@/app/misinfo/types/types"

// ----------------------------------------------------------
// Firestore instance
// ----------------------------------------------------------

const db = getFirestore(app)
const COLLECTION = "flaggedPosts"

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

function postsRef() {
  return collection(db, COLLECTION)
}

function postDocRef(id: string) {
  return doc(db, COLLECTION, id)
}

function deserializePost(id: string, data: Record<string, unknown>): FlaggedPost {
  return {
    ...data,
    id,
    submittedAt: (data.submittedAt as Timestamp)?.toDate?.() ?? new Date(),
    reviewedAt:  (data.reviewedAt  as Timestamp)?.toDate?.() ?? undefined,
    aiAnalysis: data.aiAnalysis
      ? {
          ...(data.aiAnalysis as object),
          analyzedAt:
            ((data.aiAnalysis as Record<string, unknown>).analyzedAt as Timestamp)
              ?.toDate?.() ?? new Date(),
        }
      : undefined,
  } as FlaggedPost
}

// ----------------------------------------------------------
// READ — one-time fetch
// ----------------------------------------------------------

/**
 * Fetches all flagged posts once, ordered by submittedAt descending.
 */
export async function getAllPosts(filters?: PostFilters): Promise<FlaggedPost[]> {
  let q = query(postsRef(), orderBy("submittedAt", "desc"))

  if (filters?.status)   q = query(q, where("status",   "==", filters.status))
  if (filters?.category) q = query(q, where("category", "==", filters.category))
  if (filters?.minRiskScore !== undefined) {
    q = query(q, where("aiAnalysis.riskScore", ">=", filters.minRiskScore))
  }

  const snapshot = await getDocs(q)
  let posts = snapshot.docs.map((d) => deserializePost(d.id, d.data()))

  // Client-side search (Firestore doesn't support full-text)
  if (filters?.search) {
    const term = filters.search.toLowerCase()
    posts = posts.filter(
      (p) =>
        p.pageName.toLowerCase().includes(term) ||
        p.postPreview.toLowerCase().includes(term) ||
        p.aiAnalysis?.extractedClaim?.toLowerCase().includes(term)
    )
  }

  return posts
}

/**
 * Fetches recent high-risk posts (riskScore >= threshold).
 */
export async function getHighRiskPosts(threshold = 70, max = 50): Promise<FlaggedPost[]> {
  const q = query(
    postsRef(),
    where("aiAnalysis.riskScore", ">=", threshold),
    orderBy("aiAnalysis.riskScore", "desc"),
    limit(max)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => deserializePost(d.id, d.data()))
}

// ----------------------------------------------------------
// READ — real-time subscription
// ----------------------------------------------------------

/**
 * Subscribes to real-time updates on flagged posts.
 *
 * Usage:
 *   useEffect(() => {
 *     const unsub = subscribeToPosts((posts) => setPosts(posts))
 *     return () => unsub()
 *   }, [])
 */
export function subscribeToPosts(
  callback: (posts: FlaggedPost[]) => void,
  filters?: Pick<PostFilters, "status" | "category">
): Unsubscribe {
  let q = query(postsRef(), orderBy("submittedAt", "desc"))

  if (filters?.status)   q = query(q, where("status",   "==", filters.status))
  if (filters?.category) q = query(q, where("category", "==", filters.category))

  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((d) => deserializePost(d.id, d.data()))
    callback(posts)
  })
}

// ----------------------------------------------------------
// CREATE
// ----------------------------------------------------------

/**
 * Saves a new flagged post to Firestore.
 * Used by the AI pipeline (via usePostSubmit hook) and manual submission.
 *
 * @returns The new post's Firestore ID
 */
export async function createPost(
  payload: CreateFlaggedPostPayload
): Promise<string> {
  // Duplicate URL check
  const existing = await getDocs(
    query(postsRef(), where("url", "==", payload.url), limit(1))
  )
  if (!existing.empty) {
    throw Object.assign(new Error("This post URL has already been flagged."), {
      code: "DUPLICATE",
      existingId: existing.docs[0].id,
    })
  }

  const docData = {
    url:          payload.url,
    pageName:     payload.pageName,
    postPreview:  payload.postPreview  || "",
    thumbnailUrl: payload.thumbnailUrl || null,
    category:     payload.category,
    status:       "pending" as const,
    submittedBy:  payload.submittedBy,
    submittedAt:  serverTimestamp(),
    notes:        payload.notes || null,
    aiAnalysis:   payload.aiAnalysis
      ? {
          ...payload.aiAnalysis,
          analyzedAt: Timestamp.fromDate(
            payload.aiAnalysis.analyzedAt instanceof Date
              ? payload.aiAnalysis.analyzedAt
              : new Date(payload.aiAnalysis.analyzedAt)
          ),
        }
      : null,
  }

  const ref = await addDoc(postsRef(), docData)
  return ref.id
}

// ----------------------------------------------------------
// UPDATE
// ----------------------------------------------------------

/**
 * Updates a post's status, notes, or reviewer info.
 */
export async function updatePost(
  id: string,
  updates: UpdateFlaggedPostPayload
): Promise<void> {
  if (!id) throw new Error("updatePost: document id is required")

  const payload: Record<string, unknown> = { ...updates }

  // Auto-stamp reviewedAt when verifier takes action
  if (updates.status && updates.status !== "pending") {
    payload.reviewedAt = serverTimestamp()
  }

  await updateDoc(postDocRef(id), payload)
}

// ----------------------------------------------------------
// DELETE
// ----------------------------------------------------------

/**
 * Permanently deletes a flagged post.
 */
export async function deletePost(id: string): Promise<void> {
  if (!id) throw new Error("deletePost: document id is required")
  await deleteDoc(postDocRef(id))
}

// ----------------------------------------------------------
// STATS — for dashboard summary cards
// ----------------------------------------------------------

export interface PostStats {
  total:       number
  pending:     number
  confirmed:   number
  taken_down:  number
  high_risk:   number   // riskScore >= 70
}

/**
 * Returns counts for dashboard summary cards.
 * Runs 4 parallel queries for speed.
 */
export async function getPostStats(): Promise<PostStats> {
  const [all, pending, confirmed, takenDown] = await Promise.all([
    getDocs(postsRef()),
    getDocs(query(postsRef(), where("status", "==", "pending"))),
    getDocs(query(postsRef(), where("status", "==", "confirmed"))),
    getDocs(query(postsRef(), where("status", "==", "taken_down"))),
  ])

  // high_risk count from already-fetched full list
  const highRisk = all.docs.filter(
    (d) => ((d.data().aiAnalysis as Record<string, unknown>)?.riskScore as number) >= 70
  ).length

  return {
    total:      all.size,
    pending:    pending.size,
    confirmed:  confirmed.size,
    taken_down: takenDown.size,
    high_risk:  highRisk,
  }
}