const { DateTime } = require("luxon");

module.exports = function(eleventyConfig) {
  // static files
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // nunjucks date filter: {{ someDate | date("yyyy-LL-dd") }}
  eleventyConfig.addNunjucksFilter("date", (value, fmt = "yyyy-LL-dd") => {
    if (!value) return "";
    // Eleventy passes JS Date objects for "date"
    const dt = value instanceof Date ? DateTime.fromJSDate(value) : DateTime.fromISO(String(value));
    return dt.setZone("utc").toFormat(fmt);
  });

  return { dir: { input: "src", includes: "_includes", output: "_site" } };
};
