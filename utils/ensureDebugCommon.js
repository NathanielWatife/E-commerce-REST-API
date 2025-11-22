// Workaround for Vercel/serverless environments where debug module
// fails to find './common' file. By requiring it explicitly first,
// we ensure it's available before any other module tries to use debug.
try {
  require("debug/src/common.js");
} catch (error) {
  // If this fails, debug module will handle it in the normal way
  console.warn("Could not preload debug/src/common.js:", error.message);
}

module.exports = {};
