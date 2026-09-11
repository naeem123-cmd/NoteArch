const SYSTEM_PROMPT = `
You are NoteArch, an AI assistant for architecture and interior-design meetings.

Read the COMPLETE meeting transcript and create a professional Minutes of Meeting (MOM).

The transcript may contain English, Hindi, Hinglish, mixed language, imperfect speech-to-text, repeated words, or casual conversation.

IMPORTANT RULES:
- Analyse the ENTIRE transcript.
- Do not summarize only the beginning.
- Do not invent information.
- Capture important design, material, dimensions, colours, drawings, revisions, site work, client requirements, approvals, costs, dates and responsibilities.
- If an owner is not mentioned, use an empty string.
- If a deadline is not mentioned, use an empty string.
- Keep the output useful and concise.
- Return ONLY valid JSON.
- Do not use markdown.
- Do not add any explanation outside the JSON.

Return exactly this JSON structure:

{
  "summary": "2-4 sentence summary of the complete meeting",
  "discussionPoints": [
    "Important discussion point"
  ],
  "decisions": [
    "Confirmed decision"
  ],
  "requirements": [
    "Client or project requirement"
  ],
  "actionItems": [
    {
      "task": "Task that needs to be completed",
      "owner": "Responsible person or empty string",
      "deadline": "Deadline or empty string"
    }
  ],
  "tags": [
    "short-topic-tag"
  ]
}
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const { transcript } = req.body || {};

  if (
    !transcript ||
    typeof transcript !== "string" ||
    transcript.trim().length < 5
  ) {
    return res.status(400).json({
      error: "A transcript string is required"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is missing in Vercel"
    });
  }

  try {
    const prompt = `
${SYSTEM_PROMPT}

Now analyse this COMPLETE meeting transcript:

--- TRANSCRIPT START ---
${transcript.trim()}
--- TRANSCRIPT END ---

Return ONLY the JSON object.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2000,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Gemini API error:", response.status, data);

      return res.status(502).json({
        error: "Gemini API error",
        detail:
          data?.error?.message ||
          data?.error?.status ||
          `Gemini returned status ${response.status}`
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .join("")
        .trim() || "";

    if (!text) {
      console.error("Gemini returned empty response:", data);

      return res.status(502).json({
        error: "Gemini returned an empty response"
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      try {
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("Invalid Gemini JSON:", text);

        return res.status(502).json({
          error: "Gemini returned invalid JSON"
        });
      }
    }

    return res.status(200).json({
      summary: parsed.summary || "",

      discussionPoints: Array.isArray(parsed.discussionPoints)
        ? parsed.discussionPoints
        : [],

      decisions: Array.isArray(parsed.decisions)
        ? parsed.decisions
        : [],

      requirements: Array.isArray(parsed.requirements)
        ? parsed.requirements
        : [],

      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems.map((item) => ({
            task: item?.task || "",
            owner: item?.owner || "",
            deadline: item?.deadline || "",
            done: false
          }))
        : [],

      tags: Array.isArray(parsed.tags)
        ? parsed.tags
        : []
    });
  } catch (error) {
    console.error("Summarize server error:", error);

    return res.status(500).json({
      error: error?.message || "Unknown server error"
    });
  }
}
