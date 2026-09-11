// NoteArch MOM AI
// Google Gemini API - Free Tier

const SYSTEM_PROMPT = `
You are NoteArch, an AI assistant for architecture, interior design,
construction and site meetings.

Your job is to read the COMPLETE meeting transcript and convert it into
a professional, useful and accurate MOM (Minutes of Meeting).

The transcript may contain:
- English
- Hindi
- Hinglish
- Hindi + English mixed speech
- imperfect speech-to-text
- repeated words
- informal conversation

IMPORTANT RULES:

1. Read and analyse the ENTIRE transcript.
2. Do NOT analyse only the first sentence or first few words.
3. Extract ALL useful information mentioned anywhere in the transcript.
4. Do NOT invent information.
5. Preserve important numbers, dimensions, colours, materials, dates,
   room names, drawing revisions and responsibilities.
6. If an owner is not mentioned, return an empty string.
7. If a deadline is not mentioned, return an empty string.
8. If something is discussed but not decided, do not call it a decision.
9. Keep the summary concise but cover the complete meeting.
10. Extract multiple items whenever multiple things are discussed.
11. Understand Hindi/Hinglish meaning correctly.

Pay special attention to:
- design changes
- dimensions
- materials
- colours
- finishes
- furniture
- false ceiling
- lighting
- electrical
- plumbing
- drawings
- revisions
- approvals
- client requirements
- site work
- costs
- deadlines
- responsibilities
- follow-up tasks

Return ONLY valid JSON.

Return exactly this structure:

{
  "summary": "2-4 sentence professional summary of the complete meeting",
  "discussionPoints": [
    "Important topic discussed"
  ],
  "decisions": [
    "Confirmed decision"
  ],
  "requirements": [
    "Client or project requirement"
  ],
  "actionItems": [
    {
      "task": "What needs to be done",
      "owner": "Person responsible or empty string",
      "deadline": "Deadline or empty string"
    }
  ],
  "tags": [
    "short-topic-tag"
  ]
}
`;

export default async function handler(req, res) {
  // Only POST is allowed
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { transcript } = req.body || {};

    // Validate transcript
    if (
      !transcript ||
      typeof transcript !== "string" ||
      transcript.trim().length < 5
    ) {
      return res.status(400).json({
        error: "A valid meeting transcript is required."
      });
    }

    // Get Gemini API key from Vercel Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel Environment Variables."
      });
    }

    // Gemini model
    const model = "gemini-2.5-flash";

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
      encodeURIComponent(apiKey);

    // Send COMPLETE transcript to Gemini
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: SYSTEM_PROMPT
            }
          ]
        },

        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "Analyse this COMPLETE meeting transcript carefully.\n\n" +
                  "Do not skip any useful detail.\n\n" +
                  "MEETING TRANSCRIPT:\n\n" +
                  transcript.trim()
              }
            ]
          }
        ],

        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          maxOutputTokens: 3000
        }
      })
    });

    // Read Gemini response
    const responseText = await response.text();

    // Gemini API error
    if (!response.ok) {
      let detail = responseText;

      try {
        const errorJson = JSON.parse(responseText);

        detail =
          errorJson?.error?.message ||
          errorJson?.error?.status ||
          responseText;
      } catch {
        // Keep original response text
      }

      console.error("Gemini API Error:", detail);

      return res.status(502).json({
        error: "Gemini API error",
        detail: detail
      });
    }

    // Parse Gemini JSON response
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({
        error: "Invalid response received from Gemini.",
        detail: responseText.slice(0, 1000)
      });
    }

    // Extract generated text
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .join("")
        .trim() || "";

    if (!text) {
      return res.status(502).json({
        error: "Gemini returned an empty response.",
        detail: JSON.stringify(data).slice(0, 1500)
      });
    }

    // Parse AI JSON
    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("Gemini JSON Parse Error:", text);

      return res.status(502).json({
        error: "Gemini returned invalid JSON.",
        detail: text.slice(0, 1500)
      });
    }

    // Clean action items
    const actionItems = Array.isArray(parsed.actionItems)
      ? parsed.actionItems
          .map((item) => ({
            task: String(item?.task || "").trim(),
            owner: String(item?.owner || "").trim(),
            deadline: String(item?.deadline || "").trim()
          }))
          .filter((item) => item.task)
      : [];

    // Return clean MOM data to App.jsx
    return res.status(200).json({
      summary: String(parsed.summary || "").trim(),

      discussionPoints: Array.isArray(parsed.discussionPoints)
        ? parsed.discussionPoints
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        : [],

      decisions: Array.isArray(parsed.decisions)
        ? parsed.decisions
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        : [],

      requirements: Array.isArray(parsed.requirements)
        ? parsed.requirements
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        : [],

      actionItems,

      tags: Array.isArray(parsed.tags)
        ? parsed.tags
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        : []
    });
  } catch (error) {
    console.error("NoteArch summarize error:", error);

    return res.status(500).json({
      error: "Server error while generating MOM.",
      detail: error?.message || "Unknown error"
    });
  }
}
