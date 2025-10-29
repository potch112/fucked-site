// scripts/gemini.js
async function genSatireGemini({ title, text }) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY missing");

  const MODEL = "models/gemini-2.5-flash"; // or "models/gemini-2.5-pro"
  const url = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${key}`;

  const prompt = `Return JSON ONLY with keys:
summary, lede, satire, whats_fucked, what_might_unfuck, odds_unfucking, level.

Tone brief:
- NZ/UK spelling.
- Use "fucked" 3–4 times total.
- No moralising, no activism, no advocacy.
- No cheerleading or slogans.
- Tone = mordant newsroom humour + procedural absurdity.
- You may use irony, over-formal phrasing, or ridiculous understatement to show dysfunction.
- Read like a civil-service report written by someone who’s lost faith.
- Humour comes from structure, repetition, and calm narration of madness, not emotion.
- Avoid earnestness, empathy, or outrage.
- Maintain detachment but allow sly wit.
- Ensure the writing cannot be read as left-wing or right-wing.
- No invented facts.

Formatting:
- summary: one dry sentence of fact.
- lede: two-sentence neutral setup.
- satire: 3–4 paragraphs, at least 4 sentences each, vivid but deadpan.
- whats_fucked / what_might_unfuck / odds_unfucking concise, factual.
- level ∈ {"lightly-fucked","properly-fucked","magnificently-fucked"}.

TITLE:
${title || "Untitled"}

SOURCE EXTRACT (may be partial):
${(text || "").slice(0, 6000)}
`;

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
    out.candidates?.[0]?.content?.parts?.[0]?.text ??
    out.output ??
    "";
  const jsonText = (payload.match(/\{[\s\S]*\}/) || [payload])[0];
  return JSON.parse(jsonText);
}

module.exports = { genSatireGemini };
