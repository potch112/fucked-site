const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  eleventyConfig.addNunjucksFilter("date", (value, fmt = "yyyy-LL-dd") => {
    if (!value) return "";
    const dt =
      value instanceof Date
        ? DateTime.fromJSDate(value)
        : DateTime.fromISO(String(value));
    return dt.setZone("utc").toFormat(fmt);
  });

  // paragraphs filter for Nunjucks and Liquid
  const paragraphs = (text) => {
    if (!text) return "";
    return text
      .trim()
      .split(/\n{2,}/)
      .map((p) => `<p>${p.trim()}</p>`)
      .join("\n");
  };
  eleventyConfig.addNunjucksFilter("paragraphs", paragraphs);
  eleventyConfig.addLiquidFilter("paragraphs", paragraphs);

  // keep nl2br if used elsewhere
  eleventyConfig.addNunjucksFilter("nl2br", (s) => (s || "").replace(/\n/g, "<br>"));

  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob("src/posts/**/*.md")
  );

  return { dir: { input: "src", includes: "_includes", output: "_site" } };
};
