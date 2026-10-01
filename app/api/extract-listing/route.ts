import { NextRequest, NextResponse } from 'next/server'

// Server-side only — GEMINI_API_KEY has no NEXT_PUBLIC_ prefix, so it's never
// bundled to the browser. This route is the only thing that ever sees it.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-flash-lite-latest'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const UNREADABLE_LISTING_MESSAGE = "Couldn't read that listing — please fill the form manually."

export interface ExtractedListing {
  propertyName: string | null
  city: string | null
  rent: number | null
  deposit: number | null
  maintenance: number | null
  brokerage: number | null
  furnishingStatus: 'Furnished' | 'Semi-furnished' | 'Unfurnished' | null
  parkingStatus: 'Included' | 'Not included' | null
  carpetAreaSqft: number | null
  bhk: number | null
}

function buildPrompt(listingText: string): string {
  return `You extract structured data from a real-estate rental listing's free-text description.

Return ONLY a single valid JSON object with EXACTLY these 10 keys and no others:
{
  "propertyName": string | null,
  "city": string | null,
  "rent": number | null,
  "deposit": number | null,
  "maintenance": number | null,
  "brokerage": number | null,
  "furnishingStatus": "Furnished" | "Semi-furnished" | "Unfurnished" | null,
  "parkingStatus": "Included" | "Not included" | null,
  "carpetAreaSqft": number | null,
  "bhk": number | null
}

Rules:
- If a field is not CLEARLY and EXPLICITLY stated in the text, its value MUST be null. Never guess, estimate, infer, or fill in a typical/plausible value.
- rent, deposit, maintenance, brokerage are plain numbers in rupees — no currency symbols, no commas, no "/month" suffix. If brokerage is described as a multiple of rent (e.g. "1 month brokerage") and the rent amount is also stated, output the computed number; otherwise output null rather than guessing.
- furnishingStatus: "Furnished" only for furnished/fully furnished. "Semi-furnished" only if the text explicitly says semi-furnished (or semi furnished). "Unfurnished" only if the text explicitly says unfurnished. If furnishing isn't mentioned at all, output null.
- parkingStatus: "Included" only if parking is explicitly described as included/available/provided. "Not included" only if the text explicitly says parking is not included/not available/extra/chargeable. If parking isn't mentioned, output null.
- carpetAreaSqft: a plain number in square feet, only if the text states an area explicitly in sq ft / sqft / square feet. If the area is given in a different unit (sq m, sq yards, etc.) or not stated at all, output null — do not convert or guess.
- bhk: the bedroom count, only if explicitly stated as a pattern like "2BHK", "3 BHK", or "N bedroom(s)". Output the plain number (e.g. 2, 1.5, 3). If not stated, output null.
- Do NOT extract or invent values for furnishing cost, parking cost, commute distance, stay duration, or household/family size. Those fields do not exist in this schema and are never present in listing text — ignore them entirely.
- Output nothing but the JSON object itself. No markdown code fences, no explanation, no leading or trailing text.

Listing text:
"""
${listingText}
"""`
}

/** Re-validates the model's output against the exact schema — anything that doesn't match becomes null rather than being passed through. */
function sanitizeExtraction(raw: unknown): ExtractedListing {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const furnishingStatus =
    obj.furnishingStatus === 'Furnished' || obj.furnishingStatus === 'Semi-furnished' || obj.furnishingStatus === 'Unfurnished'
      ? obj.furnishingStatus
      : null
  const parkingStatus = obj.parkingStatus === 'Included' || obj.parkingStatus === 'Not included' ? obj.parkingStatus : null

  return {
    propertyName: str(obj.propertyName),
    city: str(obj.city),
    rent: num(obj.rent),
    deposit: num(obj.deposit),
    maintenance: num(obj.maintenance),
    brokerage: num(obj.brokerage),
    furnishingStatus,
    parkingStatus,
    carpetAreaSqft: num(obj.carpetAreaSqft),
    bhk: num(obj.bhk),
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      console.error('[extract-listing] GEMINI_API_KEY is not set')
      return NextResponse.json({ error: 'Extraction is not configured on the server.' }, { status: 500 })
    }

    const body = await request.json().catch(() => null)
    const listingText = body?.listingText

    if (typeof listingText !== 'string' || !listingText.trim()) {
      return NextResponse.json({ error: 'listingText is required.' }, { status: 400 })
    }

    const geminiResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(listingText) }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text().catch(() => '')
      console.error('[extract-listing] Gemini API error:', geminiResponse.status, errText)
      return NextResponse.json({ error: UNREADABLE_LISTING_MESSAGE }, { status: 502 })
    }

    const geminiData = await geminiResponse.json()
    const rawText: string | undefined = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      console.error('[extract-listing] No text in Gemini response:', JSON.stringify(geminiData))
      return NextResponse.json({ error: UNREADABLE_LISTING_MESSAGE }, { status: 502 })
    }

    // Defensive: strip markdown code fences even though responseMimeType asks for raw JSON —
    // some responses still wrap it.
    const cleaned = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('[extract-listing] Failed to parse model output as JSON:', cleaned)
      return NextResponse.json({ error: UNREADABLE_LISTING_MESSAGE }, { status: 502 })
    }

    return NextResponse.json(sanitizeExtraction(parsed))
  } catch (error) {
    console.error('[extract-listing] Unexpected error:', error)
    return NextResponse.json({ error: UNREADABLE_LISTING_MESSAGE }, { status: 500 })
  }
}
