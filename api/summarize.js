// Vercel Serverless Function — runs on the server, keeps ANTHROPIC_API_KEY private.
// The browser never sees this key; it only calls POST /api/summarize.

const SYSTEM_PROMPT = `You are helping an interior design / architecture office turn a raw meeting transcript into a structured record. Read the transcript (it may be in Hindi, English, or a Hindi-English mix — Hinglish) and respond ONLY with a single JSON object, no markdown fences, no preamble, in this exact shape:
{"summary": "2-3 sentence plain-language summary", "decisions": ["decision 1", "decision 2"], "actionItems": [{"task": "what needs doing", "owner": "who, if mentioned, else empty string"}], "tags": ["short", "topic", "tags"]}
Keep decisions and action items short and concrete. If none exist, return an empty array for that field. Write the summary, decisions, and action items in English regardless of the transcript's language, unless a term is better left untranslated (like a material or brand name).`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { transcript } = req.body || {};
  if (!transcript || typeof transcript !== "string" || transcript.trim().length < 5) {
    return res.status(400).json({ error: "A transcript string is required" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // No key configured yet — return a basic fallback so the app still works
    // end-to-end (recording, saving, showing notes) without needing any
    // billing set up. Once ANTHROPIC_API_KEY is added later, real AI
    // summaries kick in automatically for new notes.
    const plain = transcript.trim();
    return res.status(200).json({
      summary: plain.length > 160 ? plain.slice(0, 160) + "..." : plain,
      decisions: [],
      actionItems: [],
      tags: [],
    });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: transcript }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "Anthropic API error", detail: errText });
    }

    const data = await response.json();
    const text = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();
    const clean = text.replace(/^```json\s*|^```\s*|```$/gm, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return res.status(502).json({ error: "Could not parse AI response", raw: text });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown server error" });
  }
}
