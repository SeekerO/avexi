// src/app/api/ai-compare/route.ts
// AI-powered semantic name/data comparison for the Matcher tool.
// Sends low-confidence or unmatched rows to Claude and asks it to find
// matches that fuzzy string scoring missed (nicknames, transposed names,
// abbreviations, phonetic variants, etc.)

import { NextRequest, NextResponse } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AICompareRow {
  row1: string[]; // source row   (first cell is the primary key)
  row2: string[]; // candidate row from dataset 2
}

export interface AIComparePair {
  source: string[];
  candidate: string[];
}

export interface AIMatchResult {
  source: string[];
  bestMatch: string[] | null;
  score: number; // 0–100, AI-assigned confidence
  reason: string; // short human-readable explanation
  matchType:
    | "exact"
    | "nickname"
    | "transposed"
    | "abbreviated"
    | "phonetic"
    | "other"
    | "no_match";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert data-reconciliation engine specialised in matching names and identifiers across datasets in the Philippines.

Your job: given a JSON array of { source, candidates } objects, determine which candidate (if any) best matches the source entry.

Return ONLY a valid JSON array — no markdown, no explanation outside the JSON.
Each element must follow this shape:
{
  "sourceIndex": <number>,           // index of the source in the input array
  "candidateIndex": <number | null>, // index of best candidate, or null if no match
  "score": <0–100>,                  // your confidence this is a true match
  "matchType": <"exact"|"nickname"|"transposed"|"abbreviated"|"phonetic"|"other"|"no_match">,
  "reason": "<one short sentence>"
}

Match-type definitions:
- exact        : identical or near-identical strings
- nickname     : common Filipino or English nickname (e.g. "William" → "Billy", "Maria" → "Mae")
- transposed   : first/last name order swapped
- abbreviated  : one name is an abbreviation of the other (e.g. "J. Santos" → "Jose Santos")
- phonetic     : sounds similar despite spelling difference (e.g. "Reyes" / "Reyez")
- other        : a match exists but doesn't fit the above
- no_match     : no reasonable match found

Additional rules:
- Consider Filipino naming conventions (middle name as paternal surname, compound names like "Mary Rose", "Jose Ma.", appended "Jr."/"Sr."/"III")
- A score below 60 should be treated as no_match
- Scores 60–79 = weak match; 80–89 = likely match; 90–100 = near-certain match
- If the primary cells (index 0) disagree but secondary cells (address, ID, date) agree, increase the score and note it in reason
- Never fabricate a match; when in doubt set candidateIndex to null`;

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      sources,
      dataset2,
      threshold = 60,
    } = (await req.json()) as {
      sources: string[][]; // rows from dataset1 to re-evaluate
      dataset2: string[][]; // full dataset2 to search against
      threshold?: number;
    };

    if (!Array.isArray(sources) || !Array.isArray(dataset2)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Hard cap to keep prompts manageable — caller should batch if needed
    const cappedSources = sources.slice(0, 30);
    const cappedDataset2 = dataset2.slice(0, 200);

    // Build the payload Claude will reason over
    const payload = cappedSources.map((src, srcIdx) => ({
      sourceIndex: srcIdx,
      source: src,
      candidates: cappedDataset2.map((row, rowIdx) => ({
        candidateIndex: rowIdx,
        data: row,
      })),
    }));

    const userMessage = `Match these entries:\n${JSON.stringify(payload, null, 2)}`;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI provider not configured." },
        { status: 500 },
      );
    }

    // ── Primary: Groq (fast, cheap) ──────────────────────────────────────────
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 4096,
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        }),
      },
    );

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      console.error("[ai-compare] Groq error:", err);
      return NextResponse.json(
        { error: err?.error?.message ?? "AI request failed." },
        { status: groqRes.status },
      );
    }

    const groqData = await groqRes.json();
    const rawText: string = groqData.choices?.[0]?.message?.content ?? "[]";

    // Strip markdown fences if present
    const cleaned = rawText.replace(/```json|```/gi, "").trim();

    let aiResults: Array<{
      sourceIndex: number;
      candidateIndex: number | null;
      score: number;
      matchType: AIMatchResult["matchType"];
      reason: string;
    }>;

    try {
      aiResults = JSON.parse(cleaned);
    } catch {
      console.error(
        "[ai-compare] JSON parse error. Raw:",
        rawText.slice(0, 300),
      );
      return NextResponse.json(
        { error: "AI returned malformed JSON." },
        { status: 502 },
      );
    }

    // ── Shape into AIMatchResult[] ────────────────────────────────────────────
    const results: AIMatchResult[] = aiResults
      .filter((r) => r.score >= threshold)
      .map((r) => ({
        source: cappedSources[r.sourceIndex] ?? [],
        bestMatch:
          r.candidateIndex !== null
            ? (cappedDataset2[r.candidateIndex] ?? null)
            : null,
        score: r.score,
        reason: r.reason,
        matchType: r.matchType,
      }));

    return NextResponse.json({ results, totalEvaluated: cappedSources.length });
  } catch (err: any) {
    console.error("[ai-compare] Route error:", err.message);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
