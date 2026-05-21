// Image generation edge function — uses Lovable AI Gateway (Gemini 2.5 Flash Image / Nano Banana).
// Returns a data URL the client can render inline via markdown.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    const cleaned = (prompt || "").toString().trim().slice(0, 1200);
    if (!cleaned) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 45000);
    let resp: Response;
    try {
      resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: cleaned }],
          modalities: ["image", "text"],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(t);
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      const status = resp.status === 429 || resp.status === 402 ? resp.status : 500;
      return new Response(
        JSON.stringify({ error: text || `Gateway ${resp.status}` }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const imageUrl: string | undefined =
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const text: string =
      data?.choices?.[0]?.message?.content || "";

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "No image returned", text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ imageUrl, text, prompt: cleaned }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Image generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});