// ============================================================
// MisinfoTracker — Posts CRUD API Route
// src/app/api/misinfo/posts/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
// import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/firebaseAdmin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type {
  FlaggedPost,
  CreateFlaggedPostPayload,
  PostFilters,
} from '@/app/misinfo/types/types'

const COLLECTION = 'flaggedPosts'

// ----------------------------------------------------------
// Firestore write shape — intentionally separate from FlaggedPost
// so FieldValue timestamps don't conflict with Date types
// ----------------------------------------------------------

interface PostDocument {
  url:          string
  pageName:     string
  postPreview:  string
  thumbnailUrl: string | null
  category:     string
  status:       string
  submittedBy:  string
  submittedAt:  FirebaseFirestore.FieldValue
  notes:        string | null
  aiAnalysis:   Record<string, unknown> | null
}

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

function deserializePost(id: string, data: FirebaseFirestore.DocumentData): FlaggedPost {
  return {
    ...data,
    id,
    submittedAt: (data.submittedAt as Timestamp)?.toDate?.() ?? new Date(),
    reviewedAt:  (data.reviewedAt  as Timestamp)?.toDate?.() ?? undefined,
    aiAnalysis: data.aiAnalysis
      ? {
          ...data.aiAnalysis,
          analyzedAt:
            (data.aiAnalysis.analyzedAt as Timestamp)?.toDate?.() ?? new Date(),
        }
      : undefined,
  } as FlaggedPost
}

function applyFilters(
  query: FirebaseFirestore.Query,
  filters: PostFilters
): FirebaseFirestore.Query {
  if (filters.status)   query = query.where('status',   '==', filters.status)
  if (filters.category) query = query.where('category', '==', filters.category)
  if (filters.minRiskScore !== undefined) {
    query = query.where('aiAnalysis.riskScore', '>=', filters.minRiskScore)
  }
  return query
}

// ----------------------------------------------------------
// GET /api/misinfo/posts
// ----------------------------------------------------------

export async function GET(req: NextRequest) {
//   const authError = await requireAuth(req)
//   if (authError) return authError

  const { searchParams } = new URL(req.url)

  const filters: PostFilters = {
    status:       (searchParams.get('status')   as PostFilters['status'])   || undefined,
    category:     (searchParams.get('category') as PostFilters['category']) || undefined,
    minRiskScore: searchParams.get('minRiskScore')
      ? Number(searchParams.get('minRiskScore'))
      : undefined,
    search: searchParams.get('search') || undefined,
  }

  try {
    let q: FirebaseFirestore.Query = adminDb
      .collection(COLLECTION)
      .orderBy('submittedAt', 'desc')

    q = applyFilters(q, filters)

    const snapshot = await q.get()

    let posts: FlaggedPost[] = snapshot.docs.map((doc) =>
      deserializePost(doc.id, doc.data())
    )

    if (filters.search) {
      const term = filters.search.toLowerCase()
      posts = posts.filter(
        (p) =>
          p.pageName.toLowerCase().includes(term) ||
          p.postPreview.toLowerCase().includes(term) ||
          p.aiAnalysis?.extractedClaim?.toLowerCase().includes(term)
      )
    }

    return NextResponse.json({ posts, total: posts.length })
  } catch (err) {
    console.error('[misinfo/posts] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch posts.' }, { status: 500 })
  }
}

// ----------------------------------------------------------
// POST /api/misinfo/posts
// ----------------------------------------------------------

export async function POST(req: NextRequest) {
//   const authError = await requireAuth(req)
//   if (authError) return authError

  let payload: CreateFlaggedPostPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!payload.url || !payload.pageName || !payload.submittedBy) {
    return NextResponse.json(
      { error: 'Missing required fields: url, pageName, submittedBy.' },
      { status: 400 }
    )
  }

  // Duplicate URL check
  try {
    const existing = await adminDb
      .collection(COLLECTION)
      .where('url', '==', payload.url)
      .limit(1)
      .get()

    if (!existing.empty) {
      return NextResponse.json(
        { error: 'This post URL has already been flagged.', existingId: existing.docs[0].id },
        { status: 409 }
      )
    }
  } catch (err) {
    console.error('[misinfo/posts] Duplicate check error:', err)
  }

  // Build Firestore document using PostDocument shape (not FlaggedPost)
  // This avoids the FieldValue vs Date type conflict
  const docData: PostDocument = {
    url:          payload.url,
    pageName:     payload.pageName,
    postPreview:  payload.postPreview  || '',
    thumbnailUrl: payload.thumbnailUrl || null,
    category:     payload.category,
    status:       'pending',
    submittedBy:  payload.submittedBy,
    submittedAt:  FieldValue.serverTimestamp(),
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

  try {
    const ref = await adminDb.collection(COLLECTION).add(docData)
    return NextResponse.json({ id: ref.id, success: true }, { status: 201 })
  } catch (err) {
    console.error('[misinfo/posts] POST error:', err)
    return NextResponse.json({ error: 'Failed to save post.' }, { status: 500 })
  }
}