// Public endpoint — extensão consome. Retorna core/skills ou erro estruturado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function cmpVer(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

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

  const extVersion = req.headers.get("x-ext-version") || "0.0.0";
  const licenseKey = req.headers.get("x-license-key") || "";
  const fingerprint = req.headers.get("x-client-fingerprint") || "";
  const layoutMode = req.headers.get("x-layout-mode") || "floating";

  let statusCode = 200;
  let errorCode: string | null = null;

  try {
    // settings
    const { data: settingsRows } = await supabase.from("settings").select("key,value");
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => (settings[r.key] = r.value));

    // Public updates check — no license required. Extension refreshes brand config + active skills.
    const url = new URL(req.url);
    if (url.searchParams.get("check") === "updates") {
      const { data: activeSkills } = await supabase
        .from("skills")
        .select("id,name,description,icon,payload,display_order")
        .eq("status", true)
        .order("display_order", { ascending: true });
      return json({
        ok: true,
        version: settings.min_version || "5.1.0",
        settings: {
          brand_name: settings.brand_name || "UEDA EX 5.0",
          brand_color: settings.brand_color || settings.widget_accent_color || "#4fa1c9",
          welcome_message: settings.welcome_message || "Ative sua chave para continuar.",
          footer_signature: settings.footer_signature || "",
          support_url: settings.support_url || "",
          support_email: settings.support_email || "",
          whatsapp: settings.whatsapp || "",
          renewal_url: settings.renewal_url || "",
        },
        skills: activeSkills || [],
      });
    }

    const minVersion = settings.min_version || "0.0.0";
    const updateUrl = settings.update_url || "";
    const forceUpdate = (settings.force_update || "false") === "true";

    // active release
    const { data: rel } = await supabase
      .from("releases")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const effectiveMin = rel?.min_version || minVersion;
    const forcedByRelease = !!rel?.force_update;

    if (cmpVer(extVersion, effectiveMin) < 0 || forceUpdate || forcedByRelease) {
      statusCode = 426;
      errorCode = "ext_outdated";
      return json(
        {
          error_code: "ext_outdated",
          action_url: rel?.download_url || updateUrl,
          action_label: "Atualizar extensão",
          error_display: `Sua versão ${extVersion} está desatualizada. Atualize para continuar.`,
        },
        426,
      );
    }

    if (!licenseKey) {
      statusCode = 401;
      errorCode = "chave_inexistente";
      return json({ error_code: "chave_inexistente", error_display: "Chave não informada." }, 401);
    }

    const { data: lic } = await supabase
      .from("licenses")
      .select("*")
      .eq("key", licenseKey)
      .maybeSingle();

    if (!lic) {
      statusCode = 401;
      errorCode = "chave_inexistente";
      return json({ error_code: "chave_inexistente", error_display: "Chave inválida." }, 401);
    }

    if (lic.status === "banned") {
      statusCode = 403;
      errorCode = "usuario_banido";
      return json({ error_code: "usuario_banido", error_display: "Usuário banido." }, 403);
    }

    if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
      statusCode = 403;
      errorCode = "tempo_esgotado";
      return json({ error_code: "tempo_esgotado", error_display: "Licença expirada." }, 403);
    }

    if (typeof lic.credits === "number" && lic.credits <= 0) {
      statusCode = 403;
      errorCode = "creditos_esgotados";
      return json({ error_code: "creditos_esgotados", error_display: "Créditos esgotados." }, 403);
    }

    const newSession = crypto.randomUUID();
    if (lic.fingerprint && fingerprint && lic.fingerprint !== fingerprint) {
      if (lic.session_id && lic.session_id !== newSession) {
        statusCode = 409;
        errorCode = "sessao_duplicada";
        return json(
          { error_code: "sessao_duplicada", error_display: "Sessão duplicada em outro dispositivo." },
          409,
        );
      }
    }

    // update fingerprint/session/last_seen
    await supabase
      .from("licenses")
      .update({
        fingerprint: fingerprint || lic.fingerprint,
        session_id: newSession,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", lic.id);

    const { data: skills } = await supabase
      .from("skills")
      .select("id,name,description,icon,payload,display_order")
      .eq("status", true)
      .order("display_order", { ascending: true });

    const activeSkill = skills && skills.length ? skills[0] : null;

    return json({
      ok: true,
      layout_mode: layoutMode,
      session_id: newSession,
      settings: {
        widget_accent_color: settings.widget_accent_color || "#7c3aed",
        widget_title: settings.widget_title || "UEDA EX 5.0",
        widget_subtitle: settings.widget_subtitle || "",
      },
      core_js: "// core payload placeholder",
      skills: skills || [],
      active_skill: activeSkill
        ? { name: activeSkill.name, payload: activeSkill.payload }
        : null,
    });
  } catch (e) {
    console.error(e);
    statusCode = 500;
    errorCode = "internal";
    return json({ error_code: "internal", error_display: "Erro interno." }, 500);
  } finally {
    await supabase.from("request_log").insert({
      endpoint: "fn-sv03",
      license_key: licenseKey || null,
      ext_version: extVersion,
      status_code: statusCode,
      error_code: errorCode,
    });
  }
});
