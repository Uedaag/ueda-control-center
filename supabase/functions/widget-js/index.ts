// Serve the widget runtime as JavaScript.
// To change widget behavior: edit runtime.js, run build.py, redeploy.
import runtimeSrc from "./runtime.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

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
