#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { JSDOM } = require("jsdom");
const slugify = require("slugify");
const prompts = require("prompts");

// Optional LLM
const useLLM = !!process.env.OPENAI_API_KEY;
let openai = null;
if (useLLM) {
  const { OpenAI } = require("openai");
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const POSTS_DIR = path.join("src", "posts");

function toSlug(s) {
  return slugify(s, { lower: true, strict: true }).slice(0, 80) || "post";
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


// --- normalisation helpers ---
function normaliseBody(input = "") {
  let s = String(input)
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/\n{3,}/g, "\n\n")       // collapse 3+ newlines to 2
    .replace(/(?<!\n)\n(?!\n)/g, " ") // single newline → space
    .replace(/\s{2,}/g, " ");
  s = s.replace(/([.!?])([A-Za-z])/g, "$1 $2");
  return s.trim();
}
function normaliseInline(input = "") {
  let s = String(input)
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/([.!?])([A-Za-z])/g, "$1 $2");
  return s.trim();
}

async function scrape(url) {
  const res = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000 });
  const dom = new JSDOM(res.data);
  const doc = dom.window.document;
  const title =
    (doc.querySelector("meta[property='og:title']")?.content ||
     doc.querySelector("title")?.textContent || "").trim();

  const root = doc.querySelector("article, main, [role='main']") || doc.body;
  root.querySelectorAll("script,style,noscript").forEach(n => n.remove());

  const blocks = [...root.querySelectorAll("p, h2, h3, li")]
    .map(n => n.textContent.trim())
    .filter(Boolean);

  const text = normaliseBody(blocks.length ? blocks.join("\n\n") : root.textContent);
  return { title: title || url, text };
}

function frontMatter(meta, body) {
  const source = meta.source_url && meta.source_url.trim()
    ? meta.source_url.trim()
    : "https://fucked.co.nz";

  return `---
title: "${meta.title.replace(/"/g, '\\"')}"
layout: layouts/post.njk
date: ${meta.date}
tags: ["posts"]
fucked_level: "${meta.level}"
summary: "${meta.summary.replace(/"/g, '\\"')}"
lede: "${meta.lede.replace(/"/g, '\\"')}"
source_url: "${source}"
whats_fucked: "${meta.whats_fucked.replace(/"/g, '\\"')}"
what_might_unfuck: "${meta.what_might_unfuck.replace(/"/g, '\\"')}"
odds_unfucking: "${meta.odds_unfucking.replace(/"/g, '\\"')}"
---

${body}

<p class="muted">Source: <a href="${source}">${source}</a></p>
`;
}

async function llmDraft({ title, text }) {
  const system = `You write for fucked.co.nz. Tone: formal, dry, NZ/UK spelling. No defamation. Limit the word “fucked” to ≤4 uses. No new facts—summarise. Output JSON with keys: summary, lede, satire, whats_fucked, what_might_unfuck, odds_unfucking (like "18% this year"), level in {"lightly-fucked","properly-fucked","magnificently-fucked"}.`;
  const user = `TITLE:\n${title}\n\nTEXT:\n${text.slice(0, 6000)}`;
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    temperature: 0.5
  });
  const raw = resp.choices[0].message.content;
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : JSON.parse(raw);
}

async function main() {
  fs.mkdirSync(POSTS_DIR, { recursive: true });

  // Mode + basic inputs
  const answers = await prompts([
    {
      type: "select",
      name: "mode",
      message: "Create post from:",
      choices: [
        { title: "URL (scrape)", value: "url" },
        { title: "Paste body text", value: "paste" }
      ],
      initial: 0
    },
    { type: prev => prev === "url" ? "text" : null, name: "url", message: "Article URL:" },
    { type: prev => prev === "paste" ? "text" : null, name: "title", message: "Post title:" }
  ]);

  let source_url = "";
  let title = answers.title || "";
  let text = "";

  if (answers.mode === "url") {
    const s = await scrape(answers.url);
    source_url = answers.url;
    title = s.title;
    text = s.text;
  } else {
    // manual paste for source text (for context if you use LLM later; optional)
    const bodyPrompt = await prompts({ type: "text", name: "seed", message: "Optional: paste article body for context (or Enter to skip):" });
    text = bodyPrompt.seed || "";
  }

  let meta = {};
  let satireBody = "";

  if (useLLM) {
    const j = await llmDraft({ title, text });
    meta = {
      title: normaliseInline(title),
      summary: normaliseInline(j.summary || ""),
      lede: normaliseInline(j.lede || ""),
      whats_fucked: normaliseInline(j.whats_fucked || ""),
      what_might_unfuck: normaliseInline(j.what_might_unfuck || ""),
      odds_unfucking: normaliseInline(j.odds_unfucking || "—"),
      level: j.level || "properly-fucked",
      date: new Date().toISOString().slice(0, 10),
      source_url
    };
    satireBody = normaliseBody(j.satire || "");
} else {
  // Collect long body first to avoid prompt spillover
  const satireBodyRaw = await readMultilineUntil("END");

  const man = await prompts([
    { type: "text", name: "summary", message: "One-line neutral summary:" },
    { type: "text", name: "lede", message: "Two-sentence neutral lede:" },
    { type: "select", name: "level", message: "Fucked level:", choices: [
      { title: "lightly-fucked", value: "lightly-fucked" },
      { title: "properly-fucked", value: "properly-fucked" },
      { title: "magnificently-fucked", value: "magnificently-fucked" }
    ], initial: 1 },
    { type: "text", name: "whats_fucked", message: "What’s fucked:" },
    { type: "text", name: "what_might_unfuck", message: "What might unfuck:" },
    { type: "text", name: "odds_unfucking", message: "Odds of unfucking (e.g., 18% this year):" },
    { type: "text", name: "source_url", message: "Source URL (optional):" }
  ]);

  meta = {
    title: normaliseInline(title),
    summary: normaliseInline(man.summary || ""),
    lede: normaliseInline(man.lede || ""),
    whats_fucked: normaliseInline(man.whats_fucked || ""),
    what_might_unfuck: normaliseInline(man.what_might_unfuck || ""),
    odds_unfucking: normaliseInline(man.odds_unfucking || "—"),
    level: man.level || "properly-fucked",
    date: new Date().toISOString().slice(0, 10),
    source_url: man.source_url || source_url || ""
  };
  satireBody = normaliseBody(satireBodyRaw || "");
}

  const slug = toSlug(title);
  const file = path.join(POSTS_DIR, `${meta.date}-${slug}.md`);
  const md = frontMatter(meta, `${satireBody}\n`);
  fs.writeFileSync(file, md, "utf8");

  console.log(`\nCreated: ${file}`);
  console.log(`\nNext:\n  git add "${file}" && git commit -m "post: ${slug}" && git push`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
