// Serve the widget runtime as JavaScript to the extension bootstrap.
// Editing runtime.js and redeploying updates ALL users instantly — no reinstall.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const runtimeUrl = new URL("./runtime.js", import.meta.url);
const runtimeSrc = await Deno.readTextFile(runtimeUrl);

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  return new Response(runtimeSrc, {
    headers: {
      ...cors,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
});
