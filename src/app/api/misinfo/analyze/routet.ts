// ============================================================
// MisinfoTracker — AI Analysis API Route
// src/app/api/misinfo/analyze/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
// import { requireAuth } from '@/lib/auth'         // your existing Avexi auth guard
import { RISK_THRESHOLD } from '@/app/misinfo/types/types'
import type { AIAnalysisResult } from '@/app/misinfo/types/types'

// ----------------------------------------------------------
// Config
// ----------------------------------------------------------

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = 'llama-3.3-70b-versatile'

// ----------------------------------------------------------
// Single-prompt chain
// Collapses all 4 pipeline steps into 1 Groq call.
// ----------------------------------------------------------

function buildPrompt(title: string, description: string): string {
  return `
You are a professional fact-checker and misinformation analyst for the Philippines Election Information Division.

Analyze the following Facebook post content and respond ONLY with a valid JSON object — no preamble, no markdown, no backticks.

POST TITLE: ${title}
POST DESCRIPTION: ${description}

Evaluate in this exact order:

1. Is this post related to Philippine elections, voting, COMELEC, candidates, or electoral processes?
2. Does it contain a specific verifiable factual claim (something that can be proven true or false)?
3. If both are true, analyze the claim for potential misinformation.
4. Assign a risk score from 0 to 100 based on:
   - Likelihood the claim is false or misleading (40 pts)
   - Potential harm if believed (30 pts)
   - Specificity of the claim (15 pts)
   - Urgency / time-sensitivity (15 pts)

Respond ONLY with this JSON structure:
{
  "isElectionRelated": boolean,
  "hasVerifiableClaim": boolean,
  "extractedClaim": "The specific factual claim extracted from the post, or empty string if none",
  "analysis": "Your fact-check reasoning in 2-3 sentences. If not election-related or no verifiable claim, explain briefly why.",
  "riskScore": number (0-100),
  "reasoning": "1-2 sentences explaining the risk score specifically"
}

If isElectionRelated is false OR hasVerifiableClaim is false, set riskScore to 0 and keep extractedClaim and analysis short.
`.trim()
}

// ----------------------------------------------------------
// Route Handler
// ----------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Auth guard — reuse Avexi pattern
//   const authError = await requireAuth(req)
//   if (authError) return authError

  // 2. Parse request body
  let title: string
  let description: string

  try {
    const body = await req.json()
    title       = (body.title       || '').trim()
    description = (body.description || '').trim()

    if (!title && !description) {
      return NextResponse.json(
        { error: 'Both title and description are empty. Nothing to analyze.' },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // 3. Groq API key check
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error('[misinfo/analyze] GROQ_API_KEY is not set.')
    return NextResponse.json({ error: 'AI service is not configured.' }, { status: 500 })
  }

  // 4. Call Groq — single prompt, all steps in one shot
  let rawContent: string
  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        temperature: 0.1,          // Low temp for deterministic classification
        max_tokens:  512,
        messages: [
          {
            role:    'user',
            content: buildPrompt(title, description),
          },
        ],
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      console.error('[misinfo/analyze] Groq error:', errText)
      return NextResponse.json(
        { error: 'AI analysis request failed. Try again.' },
        { status: 502 }
      )
    }

    const groqData = await groqRes.json()
    rawContent = groqData.choices?.[0]?.message?.content ?? ''
  } catch (err) {
    console.error('[misinfo/analyze] Network error:', err)
    return NextResponse.json(
      { error: 'Could not reach AI service.' },
      { status: 502 }
    )
  }

  // 5. Parse Llama JSON response
  let parsed: Omit<AIAnalysisResult, 'analyzedAt' | 'model'>
  try {
    // Strip markdown fences if Llama wraps in them despite instructions
    const clean = rawContent
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()

    parsed = JSON.parse(clean)

    // Validate required fields
    const required = [
      'isElectionRelated',
      'hasVerifiableClaim',
      'extractedClaim',
      'analysis',
      'riskScore',
      'reasoning',
    ]
    for (const field of required) {
      if (!(field in parsed)) throw new Error(`Missing field: ${field}`)
    }

    // Clamp riskScore to 0–100
    parsed.riskScore = Math.min(100, Math.max(0, Number(parsed.riskScore)))

  } catch (err) {
    console.error('[misinfo/analyze] Failed to parse Llama response:', rawContent, err)
    return NextResponse.json(
      { error: 'AI returned an unexpected response format.' },
      { status: 500 }
    )
  }

  // 6. Build final result with metadata
  const result: AIAnalysisResult = {
    ...parsed,
    analyzedAt: new Date(),
    model:      GROQ_MODEL,
  }

  // 7. Return result + pipeline decision
  return NextResponse.json({
    analysis:       result,
    shouldSave:     result.riskScore >= RISK_THRESHOLD,  // true = auto-save to Firestore
    riskThreshold:  RISK_THRESHOLD,
  })
}