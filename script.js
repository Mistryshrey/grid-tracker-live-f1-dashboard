// script.js
// This file is intentionally left minimal.
// All data fetching, polling, and rendering is handled by the
// fetchAndRender() / renderAll() functions already embedded in F1.html.
//
// The HTML polls http://localhost:3000/api/standings every 10 minutes
// automatically via:
//   pollTimer = setInterval(() => fetchAndRender(loadConfig()), POLL_MS);
//
// If you want to trigger a manual refresh from the console, run:
//   fetchAndRender(loadConfig());