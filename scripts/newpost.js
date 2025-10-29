#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const prompts = require("prompts");
const slugify = require("slugify");

const POSTS_DIR = path.join("src", "posts");

function toSlug(s) {
  return slugify(s, { lower: true, strict: true }).slice(0, 80) || "post";
}

function fm(meta, body) {
  const source = (meta.source_url || "").trim() || "https://fucked.co.nz";
  return `---\n` +
`title: "${meta.title.replace(/"/g, '\\"')}"\n` +
`layout: layouts/post.njk\n` +
`date: ${meta.date}\n` +
`tags: ["posts"]\n` +
`fucked_level: "${meta.level}"\n` +
`summary: "${(meta.summary||"").replace(/"/g, '\\"')}"\n` +
`lede: "${(meta.lede||"").replace(/"/g, '\\"')}"\n` +
`source_url: "${source}"\n` +
`whats_fucked: "${(meta.whats_fucked||"").replace(/"/g, '\\"')}"\n` +
`what_might_unfuck: "${(meta.what_might_unfuck||"").replace(/"/g, '\\"')}"\n` +
`odds_unfucking: "${(meta.odds_unfucking||"").replace(/"/g, '\\"')}"\n` +
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

async function main() {
  fs.mkdirSync(POSTS_DIR, { recursive: true });

  const basic = await prompts([
    { type: "text", name: "title", message: "Post title:" },
    { type: "text", name: "summary", message: "One-line neutral summary:" },
    { type: "text", name: "lede", message: "Two-sentence neutral lede:" },
    {
      type: "select",
      name: "level",
      message: "Fucked level:",
      choices: [
        { title: "lightly-fucked", value: "lightly-fucked" },
        { title: "properly-fucked", value: "properly-fucked" },
        { title: "magnificently-fucked", value: "magnificently-fucked" }
      ],
      initial: 1
    },
    { type: "text", name: "whats_fucked", message: "What’s fucked:" },
    { type: "text", name: "what_might_unfuck", message: "What might unfuck:" },
    { type: "text", name: "odds_unfucking", message: "Odds of unfucking (e.g., 18% this year):" },
    { type: "text", name: "source_url", message: "Source URL (optional):" }
  ]);

  console.log("\nPaste the satire body, then type END on its own line.\n");
  const satireBody = await readMultilineUntil("END");

  const meta = {
    ...basic,
    date: new Date().toISOString().slice(0, 10),
  };

  const slug = toSlug(meta.title);
  const file = path.join(POSTS_DIR, `${meta.date}-${slug}.md`);
  fs.writeFileSync(file, fm(meta, satireBody), "utf8");

  console.log(`\nCreated: ${file}`);
  console.log(`\nNext:\n  npm run build && git add . && git commit -m "post: ${slug}" && git push`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
