// scripts/scrape.js
const axios = require("axios");
const { JSDOM } = require("jsdom");

function normaliseBody(input="") {
  return String(input)
    .replace(/\r\n/g,"\n")
    .replace(/\u00A0/g," ")
    .replace(/\n{3,}/g,"\n\n")
    .replace(/(?<!\n)\n(?!\n)/g," ")
    .replace(/\s{2,}/g," ")
    .replace(/([.!?])([A-Za-z])/g,"$1 $2")
    .trim();
}

async function scrape(url) {
  const res = await axios.get(url, {
    headers:{ "User-Agent":"Mozilla/5.0" }, timeout:20000
  });
  const dom = new JSDOM(res.data);
  const doc = dom.window.document;

  const title = (
    doc.querySelector("meta[property='og:title']")?.content ||
    doc.querySelector("title")?.textContent ||
    url
  ).trim();

  const root = doc.querySelector("article, main, [role='main']") || doc.body;
  root.querySelectorAll("script,style,noscript").forEach(n=>n.remove());

  const blocks = [...root.querySelectorAll("p, h2, h3, li")]
    .map(n=>n.textContent.trim()).filter(Boolean);

  const text = normaliseBody(blocks.length ? blocks.join("\n\n") : root.textContent);
  return { title, text };
}

module.exports = { scrape };
