// scripts/gemini.js
async function genSatireGemini({ title, text }) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY missing");

  // Pick one you listed: "models/gemini-2.5-flash" or "models/gemini-2.5-pro"
  const MODEL = "models/gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${key}`;

  const prompt = `Return JSON ONLY with keys:
summary, lede, satire, whats_fucked, what_might_unfuck, odds_unfucking, level.
Rules:
- NZ/UK spelling.
- Use "fucked" 3–4 times total.
- No invented facts.
- Tone: weary, dry, on-topic.
- level ∈ {"lightly-fucked","properly-fucked","magnificently-fucked"}.

TITLE:
${title || "Untitled"}

TEXT:
${(text || "").slice(0, 6000)}
`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, responseMimeType: "application/json" }
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${body}`);
  }

  const out = await res.json();
  // Extract JSON text safely
  const payload =
    out.candidates?.[0]?.content?.parts?.[0]?.text ??
    out.output ??
    JSON.stringify(out);
  const jsonText = (payload.match(/\{[\s\S]*\}/) || [payload])[0];

  return JSON.parse(jsonText);
}

module.exports = { genSatireGemini };
