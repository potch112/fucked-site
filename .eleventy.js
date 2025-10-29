const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  eleventyConfig.addNunjucksFilter("date", (value, fmt = "yyyy-LL-dd") => {
    if (!value) return "";
    const dt = value instanceof Date ? DateTime.fromJSDate(value) : DateTime.fromISO(String(value));
    return dt.setZone("utc").toFormat(fmt);
  });

  // Sort posts newest first
  eleventyConfig.addCollection("posts", (collectionApi) => {
    const items = collectionApi.getFilteredByGlob("src/posts/**/*.md");
    items.sort((a, b) => {
      const da = new Date(a.data.date || a.date);
      const db = new Date(b.data.date || b.date);
      return db - da; // desc
    });
    return items;
  });

  return { dir: { input: "src", includes: "_includes", output: "_site" } };
};
