import setup from "debug/src/common.js";

// Exporting the boolean ensures the module is retained during bundling.
export const debugCommonLoaded = Boolean(setup);
