// Validação POST simples da licença.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let statusCode = 200;
  let errorCode: string | null = null;
  let key = "";

  try {
    const body = await req.json().catch(() => ({}));
    key = body.license_key || body.key || "";
    const fingerprint = body.fingerprint || "";

    if (!key) {
      statusCode = 400;
      errorCode = "chave_inexistente";
      return json({ ok: false, error_code: "chave_inexistente" }, 400);
    }

    const { data: lic } = await supabase
      .from("licenses")
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (!lic) {
      statusCode = 401;
      errorCode = "chave_inexistente";
      return json({ ok: false, error_code: "chave_inexistente" }, 401);
    }
    if (lic.status === "banned") {
      statusCode = 403;
      errorCode = "usuario_banido";
      return json({ ok: false, error_code: "usuario_banido" }, 403);
    }
    if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
      statusCode = 403;
      errorCode = "tempo_esgotado";
      return json({ ok: false, error_code: "tempo_esgotado" }, 403);
    }
    if (typeof lic.credits === "number" && lic.credits <= 0) {
      statusCode = 403;
      errorCode = "creditos_esgotados";
      return json({ ok: false, error_code: "creditos_esgotados" }, 403);
    }
    if (lic.fingerprint && fingerprint && lic.fingerprint !== fingerprint && lic.session_id) {
      statusCode = 409;
      errorCode = "sessao_duplicada";
      return json({ ok: false, error_code: "sessao_duplicada" }, 409);
    }

    return json({
      ok: true,
      label: lic.label || "",
      credits: lic.credits,
      expires_at: lic.expires_at,
      status: lic.status,
    });
  } catch (e) {
    console.error(e);
    statusCode = 500;
    errorCode = "internal";
    return json({ ok: false, error_code: "internal" }, 500);
  } finally {
    await supabase.from("request_log").insert({
      endpoint: "fn-vl04",
      license_key: key || null,
      status_code: statusCode,
      error_code: errorCode,
    });
  }
});
