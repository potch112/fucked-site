const { DateTime } = require("luxon");

module.exports = function(eleventyConfig) {
  // Copy static assets from src/assets → /assets
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Nunjucks date filter: {{ date | date("yyyy-LL-dd") }}
  eleventyConfig.addNunjucksFilter("date", (value, fmt = "yyyy-LL-dd") => {
    if (!value) return "";
    const dt = value instanceof Date
      ? DateTime.fromJSDate(value)
      : DateTime.fromISO(String(value));
    return dt.setZone("utc").toFormat(fmt);
    // Examples: "yyyy-LL-dd", "dd LLL yyyy", "yyyy-LL-dd HH:mm"
  });

  // Posts collection: all Markdown in src/posts/** with tags: ["posts"]
  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi.getFilteredByGlob("src/posts/**/*.md")
  );

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site"
    }
  };
};
