// Vercel Serverless Function
// NoteArch MOM AI — Google Gemini Free Tier

const SYSTEM_PROMPT = `
You are NoteArch, an AI assistant for architecture and interior-design meetings.

Your job is to read the COMPLETE meeting transcript and convert it into a useful professional MOM.

The transcript can be:
- English
- Hindi
- Hinglish
- mixed Hindi + English
- imperfect speech-to-text

IMPORTANT:
1. Read and analyse the ENTIRE transcript.
2. Do NOT summarize only the first few words or first sentence.
3. Extract useful information even when it is mentioned casually.
4. Do not invent facts that are not present in the transcript.
5. If a person, owner, or deadline is not mentioned, use an empty string.
6. Keep the output concise but complete.
7. Return ONLY valid JSON. No markdown. No explanation.

Return exactly this structure:

{
  "summary": "A clear 2-4 sentence summary of the complete meeting",
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
      "owner": "Person responsible, or empty string",
      "deadline": "Deadline, or empty string"
    }
  ],
  "tags": [
    "false-ceiling",
    "lighting",
    "living-room"
  ]
}

For example, if the transcript says:

"Client said living room ka ceiling 100mm neeche kar do aur lights warm white rakhni hain. Chintan Friday tak revised drawing bhejega."

Return something like:

{
  "summary": "The client confirmed that the living room false ceiling should be lowered by 100mm and the lighting should be warm white. Chintan will send the revised drawing by Friday.",
  "discussionPoints": [
    "Living room false ceiling",
    "Lighting colour temperature",
    "Revised drawing"
  ],
  "decisions": [
    "Lower the living room false ceiling by 100mm"
  ],
  "requirements": [
    "Use warm white lighting"
  ],
  "actionItems": [
    {
      "task": "Send revised drawing",
      "owner": "Chintan",
      "deadline": "Friday"
    }
  ],
  "tags": [
    "false-ceiling",
    "lighting",
    "living-room",
    "revised-drawing"
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
      error: "GEMINI_API_KEY is not configured in Vercel"
    });
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
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
                    "Analyse this COMPLETE meeting transcript and create the MOM:\n\n" +
                    transcript.trim()
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            maxOutputTokens: 2000
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return res.status(502).json({
        error: "Gemini API error",
        detail: errorText
      });
    }

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "";

    if (!text) {
      return res.status(502).json({
        error: "Gemini returned an empty response"
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      return res.status(502).json({
        error: "Could not parse Gemini response",
        raw: text
      });
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
            deadline: item?.deadline || ""
          }))
        : [],
      tags: Array.isArray(parsed.tags)
        ? parsed.tags
        : []
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unknown server error"
    });
  }
}
