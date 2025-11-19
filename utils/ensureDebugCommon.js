const setup = require("debug/src/common.js");

// Exporting the boolean ensures the module is retained during bundling.
const debugCommonLoaded = Boolean(setup);

module.exports = { debugCommonLoaded };
