const { scrape } = require("./scrape");
const { genSatireGemini } = require("./gemini");
const fs = require("fs");
const path = require("path");
const prompts = require("prompts");
const slugify = require("slugify");

const POSTS_DIR = path.join("src", "posts");

function toSlug(s) {
  return slugify(s, { lower: true, strict: true }).slice(0, 80) || "post";
}

function fm(meta, body) {
  const esc = (v="") => String(v).replace(/"/g, '\\"');
  const source = (meta.source_url || "").trim() || "https://fucked.co.nz";
  return `---\n` +
`title: "${esc(meta.title)}"\n` +
`layout: layouts/post.njk\n` +
`date: ${meta.date}\n` +
`tags: ["posts"]\n` +
`fucked_level: "${esc(meta.level)}"\n` +
`summary: "${esc(meta.summary)}"\n` +
`lede: "${esc(meta.lede)}"\n` +
`source_url: "${source}"\n` +
`whats_fucked: "${esc(meta.whats_fucked)}"\n` +
`what_might_unfuck: "${esc(meta.what_might_unfuck)}"\n` +
`odds_unfucking: "${esc(meta.odds_unfucking)}"\n` +
`---\n\n${body}\n\n<p class="muted">Source: <a href="${source}">${source}</a></p>\n`;
}

const readline = require("readline");
function readMultilineUntil(term = "END") {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const lines = [];
    console.log(`\nPaste the satire body (any length). Type ${term} on its own line to finish.\n`);
    rl.on("line", line => {
      if (line.trim() === term) rl.close();
      else lines.push(line);
    });
    rl.on("close", () => resolve(lines.join("\n")));
  });
}

async function manualFlow() {
  const basic = await prompts([
    { type: "text", name: "title", message: "Post title:" },
    { type: "text", name: "summary", message: "One-line neutral summary:" },
    { type: "text", name: "lede", message: "Two-sentence neutral lede:" },
    {
      type: "select", name: "level", message: "Fucked level:",
      choices: [
        { title: "lightly-fucked", value: "lightly-fucked" },
        { title: "properly-fucked", value: "properly-fucked" },
        { title: "magnificently-fucked", value: "magnificently-fucked" }
      ], initial: 1
    },
    { type: "text", name: "whats_fucked", message: "What’s fucked:" },
    { type: "text", name: "what_might_unfuck", message: "What might unfuck:" },
    { type: "text", name: "odds_unfucking", message: "Odds of unfucking (e.g., 18% this year):" },
    { type: "text", name: "source_url", message: "Source URL (optional):" }
  ]);
  console.log("\nPaste the satire body, then type END on its own line.\n");
  const satireBody = await readMultilineUntil("END");
  return { basic, satireBody, contextText: "" };
}

async function geminiFlow() {
  const a = await prompts([
    { type:"text", name:"title", message:"Post title (leave blank to use page title):" },
    { type:"select", name:"mode", message:"Provide:", choices:[
      { title:"URL (auto-scrape)", value:"url" },
      { title:"Paste body (manual)", value:"paste" }
    ], initial:0 },
    { type: prev => prev==="url" ? "text" : null, name:"url", message:"Article URL:" },
    { type: prev => prev==="paste" ? "text" : null, name:"contextText", message:"Paste article text:" },
    { type:"text", name:"source_url", message:"Source URL (optional):" }
  ]);

  let title = a.title?.trim();
  let contextText = a.contextText || "";
  let source_url = a.source_url || "";

  if (a.mode === "url" && a.url) {
    const s = await scrape(a.url);
    if (!title) title = s.title;
    contextText = s.text;
    if (!source_url) source_url = a.url;
  }

  // Guard: if scrape failed or too short, ask user to paste
  if (!contextText || contextText.length < 400) {
    console.log("\nCouldn’t extract enough readable text. Paste the body, then type END on its own line.\n");
    contextText = await readMultilineUntil("END");
    if (!contextText.trim()) throw new Error("No content provided.");
  }

  const j = await genSatireGemini({ title: title || "Untitled", text: contextText });

  const valid = new Set(["lightly-fucked","properly-fucked","magnificently-fucked"]);
  const meta = {
    title: title || "Untitled",
    summary: j.summary || "",
    lede: j.lede || "",
    whats_fucked: j.whats_fucked || "",
    what_might_unfuck: j.what_might_unfuck || "",
    odds_unfucking: j.odds_unfucking || "—",
    level: valid.has(j.level) ? j.level : "properly-fucked",
    date: new Date().toISOString(),
    source_url
  };
  // Ensure multi-paragraph structure is kept
  const satireBody = (j.satire || "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { basic: meta, satireBody };
}

async function main() {
  fs.mkdirSync(POSTS_DIR, { recursive: true });

  let meta, satireBody;
  if (process.env.GOOGLE_API_KEY) {
    const pick = await prompts({
      type: "select", name: "mode", message: "Create post with:",
      choices: [
        { title: "Gemini (auto-generate fields)", value: "gemini" },
        { title: "Manual prompts", value: "manual" }
      ], initial: 0
    });
    if (pick.mode === "gemini") {
      const out = await geminiFlow();
      meta = out.basic;
      satireBody = out.satireBody;
    } else {
      const out = await manualFlow();
      meta = { ...out.basic, date: new Date().toISOString().slice(0, 10) };
      satireBody = out.satireBody;
    }
  } else {
    const out = await manualFlow();
    meta = { ...out.basic, date: new Date().toISOString().slice(0, 10) };
    satireBody = out.satireBody;
  }

  const slug = toSlug(meta.title);
  const file = path.join(POSTS_DIR, `${meta.date}-${slug}.md`);
  fs.writeFileSync(file, fm(meta, satireBody), "utf8");

  console.log(`\nCreated: ${file}`);
  console.log(`\nNext:\n  npm run build\n  git add .\n  git commit -m "post: ${slug}"\n  git push`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
