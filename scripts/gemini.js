// scripts/gemini.js
async function genSatireGemini({ title, text }) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY missing");

  const MODEL = "models/gemini-2.5-flash"; // or "models/gemini-2.5-pro"
  const url = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${key}`;

  const prompt =
`Return ONLY JSON with keys:
summary, lede, satire, whats_fucked, what_might_unfuck, odds_unfucking, level.

Global rules:
- NZ/UK spelling only.
- Use the word "fucked" exactly 3–4 times total across all fields.
- Zero new facts. Derive every detail from TEXT. If uncertain, stay vague.
- No advocacy, no moralising, no praise, no activist language, no prescriptions.
- No “should,” “must,” “we need to,” “justice,” “equity,” “fairness,” “crisis,” “harm,” “vulnerable,” “communities,” “values,” “stakeholders,” “evidence shows,” “experts say.”
- Ban cheerleading verbs: “tackle,” “address,” “combat,” “empower,” “advance,” “uplift,” “transform,” “bold,” “groundbreaking,” “vision.”
- Ban PR clichés: “shine a light,” “move the needle,” “meaningful change,” “lived experience,” “holistic approach,” “best practice,” “journey.”
- Avoid framing any side as righteous, oppressed, villainous, or enlightened. Describe optics, mechanics, and incentives only.
- Skeptical, deadpan, detached. Understatement over slogans. Dry humour from procedure and bureaucracy, not morality.
- If topic touches identity, climate, inequality, or reform: describe what happened and how it looks; do not say who is right.
-Be skeptical of everything, especially if it is clearly left-wing or right-wing.
-Ask yourself: "what's in it for this person, why are they proposing/saying/doing this?" and approach the topic from their. (i.e., "what's their angle?")
- No policy recommendations. No calls to action. No “the bill will,” “this will ensure,” or implied causality beyond observation.
- Keep sentences concrete and specific, not abstract. Prefer verifiable nouns over values-language.
- level ∈ {"lightly-fucked","properly-fucked","magnificently-fucked"}.

Field rules:
- summary: 1 sentence, neutral, no adjectives beyond necessary descriptors.
- lede: 2 sentences, neutral newsroom style, no spin, no adjectives that imply approval/disapproval.
- satire: 3–4 paragraphs minimum, each ≥4 sentences. Voice: weary reporter cataloguing dysfunction. Techniques allowed: irony, dry understatement, procedural absurdity, euphemism. Forbidden: sermons, scolding, hopeful uplift, activism.
- whats_fucked: 1–2 sentences, mechanics-only (e.g., “conflicting incentives,” “messaging vs delivery,” “process failure,” “perverse outcomes”).
- what_might_unfuck: 1 sentence, strictly operational (coordination, comms, sequencing). No “should,” no value judgements.
- odds_unfucking: format like “23% ” (0–100%). Briefly justify with one operational clause, not moral claims.

Style constraints:
- No metaphors about “shining light,” “journeys,” “voices,” “healing,” or “communities.”
- No superlatives unless quoted from TEXT.
- Do not name winners/losers in moral terms; use “optics,” “timing,” “capacity,” “execution,” “coalition management,” “backlog,” “compliance cost.”
- Maintain irony without sneer. No snark about voters or broad groups.

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
