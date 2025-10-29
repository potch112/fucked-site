// scripts/gemini.js
async function genSatireGemini({ title, text }) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY missing");

  const MODEL = "models/gemini-2.5-flash"; // or "models/gemini-2.5-pro"
  const url = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${key}`;

  const prompt =
`Return ONLY JSON with keys:
summary, lede, satire, whats_fucked, what_might_unfuck, odds_unfucking, level.
Rules:
- NZ/UK spelling. No new facts. No defamation. On-topic. No pandering to left wing or right wing - just objectivity.
- Use the word "fucked" 3–4 times total, distributed across the piece.
- Tone: weary, dry, specific, grounded in the provided text.
- "satire" MUST be 3–4 paragraphs, 200–300 words total, with clear paragraph breaks.
- Give it a distinct narrative voice. Avoid listiness.
- "level" ∈ {"lightly-fucked","properly-fucked","magnificently-fucked"}.
- Keep "summary" one line. "lede" two sentences max.

TITLE:
${title}

SOURCE EXTRACT (may be partial):
${(text || "").slice(0, 6000)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        topP: 0.95,
        responseMimeType: "application/json"
      }
    })
  });

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  const out = await res.json();
  const payload =
    out.candidates?.[0]?.content?.parts?.[0]?.text ||
    out.output ||
    JSON.stringify(out);
  const jsonText = (payload.match(/\{[\s\S]*\}/) || [payload])[0];
  return JSON.parse(jsonText);
}

module.exports = { genSatireGemini };
