const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  // Assets
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Date filter
  eleventyConfig.addNunjucksFilter("date", (value, fmt = "yyyy-LL-dd") => {
    if (!value) return "";
    const dt =
      value instanceof Date
        ? DateTime.fromJSDate(value)
        : DateTime.fromISO(String(value));
    return dt.setZone("utc").toFormat(fmt);
  });

  // Paragraphs filter
  eleventyConfig.addFilter("paragraphs", (value) => {
    if (!value) return "";
    if (/<\/(p|ul|ol|h\d|blockquote|pre|table)>/i.test(value)) return value;
    return String(value)
      .trim()
      .split(/\r?\n\r?\n+/)
      .map((p) => `<p>${p.trim().replace(/\r?\n/g, " ")}</p>`)
      .join("\n");
  });

  // Posts newest first
  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("src/posts/**/*.md")
      .sort((a, b) =>
        new Date(b.data.date || b.date).getTime() -
        new Date(a.data.date || a.date).getTime()
      );
  });

  return {
    dir: { input: "src", includes: "_includes", output: "_site" },
  };
};
