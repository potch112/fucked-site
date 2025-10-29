const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  // Copy assets
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Date filter → {{ date | date("yyyy-LL-dd") }}
  eleventyConfig.addNunjucksFilter("date", (value, fmt = "yyyy-LL-dd") => {
    if (!value) return "";
    const dt =
      value instanceof Date
        ? DateTime.fromJSDate(value)
        : DateTime.fromISO(String(value));
    return dt.setZone("utc").toFormat(fmt);
  });

  // Paragraphs filter (keeps existing HTML intact)
  eleventyConfig.addFilter("paragraphs", (value) => {
    if (!value) return "";
    if (/<\/(p|ul|ol|h\d|blockquote|pre|table)>/i.test(value)) return value;
    return String(value)
      .trim()
      .split(/\r?\n\r?\n+/)
      .map((p) => `<p>${p.trim().replace(/\r?\n/g, " ")}</p>`)
      .join("\n");
  });

  // Limit filter → {{ array | limit(5) }}
  eleventyConfig.addFilter("limit", (arr, n) =>
    Array.isArray(arr) ? arr.slice(0, n) : []
  );

  // Posts: newest first by robust date resolution
  eleventyConfig.addCollection("posts", (collectionApi) => {
    const posts = collectionApi.getFilteredByGlob("src/posts/**/*.md");
    const parse = (d) => {
      if (d instanceof Date) return d.getTime();
      const iso = DateTime.fromISO(String(d), { zone: "utc" });
      return iso.isValid ? iso.toMillis() : 0;
    };
    return posts.sort((a, b) => {
      const aDate = parse(a.data.date ?? a.date ?? a.data.page?.date);
      const bDate = parse(b.data.date ?? b.date ?? b.data.page?.date);
      return bDate - aDate; // desc
    });
  });

  return {
    dir: { input: "src", includes: "_includes", output: "_site" },
  };
};
