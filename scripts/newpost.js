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

async function scrape(url) {
  const res = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000 });
  const dom = new JSDOM(res.data);
  const doc = dom.window.document;
  const title =
    (doc.querySelector("meta[property='og:title']")?.content ||
     doc.querySelector("title")?.textContent ||
     "").trim();
  // Crude body extraction
  const article =
    doc.querySelector("article") ||
    doc.querySelector("main") ||
    doc.querySelector("[role='main']") ||
    doc.body;
  // Strip scripts/styles
  article.querySelectorAll("script,style,noscript").forEach(n => n.remove());
  const text = article.textContent.replace(/\s+/g, " ").trim();
  return { title: title || url, text };
}

function frontMatter(meta, body) {
  return `---
title: "${meta.title.replace(/"/g, '\\"')}"
layout: layouts/post.njk
date: ${meta.date}
tags: ["posts"]
fucked_level: "${meta.level}"
summary: "${meta.summary.replace(/"/g, '\\"')}"
lede: "${meta.lede.replace(/"/g, '\\"')}"
source_url: "${meta.source_url}"
whats_fucked: "${meta.whats_fucked.replace(/"/g, '\\"')}"
what_might_unfuck: "${meta.what_might_unfuck.replace(/"/g, '\\"')}"
odds_unfucking: "${meta.odds_unfucking.replace(/"/g, '\\"')}"
---

${body}

${meta.source_url ? `\n\n<p class="muted">Source: <a href="${meta.source_url}">${meta.source_url}</a></p>\n` : ""}`;
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
  // Try to extract JSON
  const match = raw.match(/\{[\s\S]*\}/);
  const j = match ? JSON.parse(match[0]) : JSON.parse(raw);
  return j;
}

async function main() {
  // Ensure posts dir
  fs.mkdirSync(POSTS_DIR, { recursive: true });

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
    { type: prev => prev === "paste" ? "text" : null, name: "title", message: "Post title:" },
    { type: prev => prev === "paste" ? "text" : null, name: "text", message: "Paste article body text:" }
  ]);

  let source_url = "";
  let title = answers.title || "";
  let text = answers.text || "";

  if (answers.mode === "url") {
    const s = await scrape(answers.url);
    source_url = answers.url;
    title = s.title;
    text = s.text;
  }

  let meta = {};
  let satireBody = "";

  if (useLLM) {
    const j = await llmDraft({ title, text });
    meta = {
      title,
      summary: j.summary || "",
      lede: j.lede || "",
      whats_fucked: j.whats_fucked || "",
      what_might_unfuck: j.what_might_unfuck || "",
      odds_unfucking: j.odds_unfucking || "—",
      level: j.level || "properly-fucked",
      date: new Date().toISOString().slice(0, 10),
      source_url
    };
    satireBody = j.satire || "";
  } else {
    // Manual prompts
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
      { type: "text", name: "satire", message: "Satire body (120–180 words, dry, NZ/UK spelling):" }
    ]);
    meta = {
      title,
      summary: man.summary || "",
      lede: man.lede || "",
      whats_fucked: man.whats_fucked || "",
      what_might_unfuck: man.what_might_unfuck || "",
      odds_unfucking: man.odds_unfucking || "—",
      level: man.level || "properly-fucked",
      date: new Date().toISOString().slice(0, 10),
      source_url
    };
    satireBody = man.satire || "";
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
