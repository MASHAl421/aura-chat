import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TtsLang = "ur" | "en";

// Strip markdown / control chars but keep punctuation so prosody stays natural.
const cleanText = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/[*_~#>`]/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

// Google translate_tts has a hard ~200 char limit per request.
// For smooth playback we split on sentence boundaries (Urdu + English) and
// keep each chunk well under the limit, preferring natural pauses.
const CHUNK_LIMIT = 180;

function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_LIMIT) return [text];

  // Split on sentence enders for both English and Urdu (۔ ؟ ! . ? ;)
  const sentences = text
    .split(/(?<=[۔؟!?.;])\s+/)
    .flatMap((s) => (s.length <= CHUNK_LIMIT ? [s] : s.split(/(?<=[،,])\s+/)))
    .flatMap((s) => {
      if (s.length <= CHUNK_LIMIT) return [s];
      // Hard wrap on whitespace as a last resort
      const out: string[] = [];
      let current = "";
      for (const word of s.split(/\s+/)) {
        if ((current + " " + word).trim().length > CHUNK_LIMIT) {
          if (current) out.push(current.trim());
          current = word;
        } else {
          current = (current + " " + word).trim();
        }
      }
      if (current) out.push(current.trim());
      return out;
    })
    .filter(Boolean);

  // Greedily pack adjacent small sentences together up to limit for fewer requests.
  const packed: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (!buf) {
      buf = s;
    } else if ((buf + " " + s).length <= CHUNK_LIMIT) {
      buf = buf + " " + s;
    } else {
      packed.push(buf);
      buf = s;
    }
  }
  if (buf) packed.push(buf);
  return packed;
}

async function fetchGoogleTts(chunk: string, lang: TtsLang, index: number, total: number): Promise<Uint8Array> {
  const url = new URL("https://translate.google.com/translate_tts");
  url.searchParams.set("ie", "UTF-8");
  url.searchParams.set("client", "tw-ob");
  url.searchParams.set("tl", lang);
  url.searchParams.set("ttsspeed", "1");
  url.searchParams.set("total", String(total));
  url.searchParams.set("idx", String(index));
  url.searchParams.set("textlen", String(chunk.length));
  url.searchParams.set("q", chunk);

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept": "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
      "Accept-Language": lang === "ur" ? "ur-PK,ur;q=0.9,en;q=0.8" : "en-US,en;q=0.9",
      "Referer": "https://translate.google.com/",
    },
  });

  if (!response.ok) {
    throw new Error(`TTS chunk ${index + 1}/${total} failed: ${response.status}`);
  }
  const buf = await response.arrayBuffer();
  return new Uint8Array(buf);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const text = cleanText(String(body.text || ""));
    const lang: TtsLang = body.lang === "ur" ? "ur" : "en";

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap overall length to avoid excessive runtime; ~3000 chars is plenty for a spoken answer.
    const safeText = text.slice(0, 3000);
    const chunks = splitIntoChunks(safeText);

    // Fetch chunks in parallel for speed but keep order for concatenation.
    const audioParts = await Promise.all(
      chunks.map((chunk, i) => fetchGoogleTts(chunk, lang, i, chunks.length)),
    );

    // Concatenate MP3 frames — browsers play sequential MP3 frames as a single stream.
    const totalLen = audioParts.reduce((sum, part) => sum + part.byteLength, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const part of audioParts) {
      merged.set(part, offset);
      offset += part.byteLength;
    }

    return new Response(
      JSON.stringify({ audioContent: base64Encode(merged.buffer) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS error";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
