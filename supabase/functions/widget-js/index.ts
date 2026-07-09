// Serve the widget runtime as JavaScript to the extension bootstrap.
// Editing runtime.js and redeploying updates ALL users instantly — no reinstall.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

let runtimeCache: string | null = null;

async function loadRuntime(): Promise<string> {
  if (runtimeCache !== null) return runtimeCache;
  const url = new URL("./runtime.js", import.meta.url);
  runtimeCache = await Deno.readTextFile(url);
  return runtimeCache;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const src = await loadRuntime();
    return new Response(src, {
      headers: {
        ...cors,
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (e) {
    console.error("widget-js load failed", e);
    return new Response(
      `console.error("[UEDA] runtime indisponível: ${String(e).replace(/"/g, "'")}");`,
      { status: 500, headers: { ...cors, "Content-Type": "application/javascript" } },
    );
  }
});
