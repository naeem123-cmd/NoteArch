export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, mimeType } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured in Vercel",
    });
  }

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Audio URL is required" });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "";

  if (
    !supabaseUrl ||
    !url.startsWith(`${supabaseUrl}/storage/v1/object/sign/note-audio/`)
  ) {
    return res.status(400).json({
      error: "Invalid audio source",
    });
  }

  const allowedMimeTypes = new Set([
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/aac",
    "audio/ogg",
    "audio/flac",
    "audio/m4a",
    "audio/mp4",
    "audio/x-m4a",
    "audio/webm",
    "audio/opus",
  ]);

  if (mimeType && !allowedMimeTypes.has(mimeType)) {
    return res.status(400).json({
      error: "Unsupported audio format",
    });
  }

  try {
    const audioResponse = await fetch(url);

    if (!audioResponse.ok) {
      return res.status(400).json({
        error: "Could not read the uploaded audio file",
      });
    }

    const contentLength = Number(audioResponse.headers.get("content-length") || 0);
    if (contentLength > 50 * 1024 * 1024) {
      return res.status(413).json({
        error: "This recording is larger than 50 MB. Please upload a smaller/compressed recording.",
      });
    }

    const buffer = Buffer.from(await audioResponse.arrayBuffer());

    if (buffer.length > 50 * 1024 * 1024) {
      return res.status(413).json({
        error: "This recording is larger than 50 MB. Please upload a smaller/compressed recording.",
      });
    }

    const detectedMime =
      mimeType ||
      audioResponse.headers.get("content-type") ||
      "audio/mpeg";

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Transcribe this complete meeting recording accurately.

The meeting may be in English, Hindi, Hinglish, or mixed Hindi + English.

Rules:
1. Do not summarize yet. Return the complete useful speech as text.
2. Preserve important names, numbers, dimensions, materials, colours, dates, costs, decisions, requirements and responsibilities.
3. Do not invent speech that is not present.
4. Keep the transcript readable.
5. Return only the transcript text.`,
                },
                {
                  inlineData: {
                    mimeType: detectedMime,
                    data: buffer.toString("base64"),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 12000,
          },
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({
        error: "Gemini transcription failed",
        detail,
      });
    }

    const data = await response.json();
    const transcript =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join(" ")
        .trim() || "";

    if (!transcript) {
      return res.status(502).json({
        error: "Gemini returned an empty transcription",
      });
    }

    return res.status(200).json({ transcript });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unknown transcription error",
    });
  }
}
