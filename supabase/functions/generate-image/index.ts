import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { IMAGE_DOMAIN_GUARDRAILS, prefilterPrompt, recordGuardrailEvent } from "../_shared/guardrails.ts";
import { recordInternalCost } from "../_shared/ledger.ts";

// Server-side copy of the curated style presets in src/lib/image-styles.ts —
// ids must stay in sync with the client picker. Art direction lives here so
// a tampered client can't strip the craft constraints or the negative list.
const GLOBAL_NEGATIVE =
  "generic AI-art gloss, plastic skin, waxy faces, extra fingers, warped hands, " +
  "lens-flare kitsch, oversaturated HDR, neon cyberpunk palette, watermark, " +
  "signature, stock-photo staging, uncanny photorealistic Jesus face, " +
  "cluttered composition, random meaningless glyphs, misspelled or garbled text";

const STYLES: Record<string, { prompt: string; negative?: string; typographic?: boolean }> = {
  "modern-verse-type": {
    typographic: true,
    prompt:
      "Bold contemporary typographic poster. The featured text is the hero: set large in an elegant high-contrast serif (Spectral/Canela feel) with tight, deliberate kerning, generous margins, and a strict grid. Muted paper background (warm ivory or deep slate), one restrained brass-gold accent rule or ornament. Swiss-poster discipline meets sacred text. Flat, print-ready, no photographic elements.",
    negative: "gradient wordart, drop shadows on text, more than two typefaces",
  },
  "modern-minimal": {
    prompt:
      "Minimalist sacred design: a single geometric symbol distilled from the subject, rendered in flat shapes with generous negative space. Two or three colors maximum on a warm paper or deep slate field, with a brass-gold accent. Composition balanced like a gallery print. Calm, contemporary, reverent.",
  },
  "modern-editorial": {
    prompt:
      "Contemporary editorial illustration in the manner of a serious culture magazine: textured risograph grain, limited earthy palette (ivory, ink, ochre, sage), confident asymmetric composition on a visible grid, subtle paper texture. Human figures stylized and dignified, never photoreal. Feels hand-crafted and printed, not rendered.",
  },
  "modern-abstract-light": {
    prompt:
      "Abstract contemplative artwork: soft volumetric light breaking through darkness, layered translucent color fields in indigo, ivory and gold, painterly texture like large-format oil on linen. No figures, no literal objects — pure light, depth, and atmosphere evoking the transcendent. Museum-quality restraint.",
  },
  "classic-illuminated": {
    typographic: true,
    prompt:
      "Medieval illuminated manuscript plate: intricate hand-painted border of vines and gold leaf, a large historiated initial capital, featured text lettered in careful blackletter-inspired calligraphy on aged vellum. Lapis blue, vermilion, and burnished gold pigments. Authentic scriptorium craft, symmetrical and precise.",
    negative: "modern fonts, clean digital edges",
  },
  "classic-stained-glass": {
    prompt:
      "Cathedral stained-glass window: bold black leading dividing luminous jewel-toned panes (cobalt, ruby, amber, emerald), figures in the elongated, serene Gothic manner, light appearing to glow through the glass. Symmetrical architectural framing with a rose-window motif. Reverent and monumental.",
  },
  "classic-oil": {
    prompt:
      "Old-master oil painting: Rembrandt-school chiaroscuro with warm candlelit highlights emerging from deep umber shadow, dignified naturalistic figures with weight and humanity, visible brushwork and craquelure, composed like a Baroque altarpiece. Solemn, humane, timeless.",
    negative: "airbrushed smoothness, digital painting sheen",
  },
  "classic-engraving": {
    prompt:
      "Nineteenth-century steel engraving in the manner of Gustave Doré: dense parallel hatching and cross-hatching building dramatic light, monochrome ink on cream paper, epic scale and swirling atmosphere, fine controlled linework throughout. Printed-book plate aesthetic.",
    negative: "color, halftone dots, sketchy pencil texture",
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { prompt, negative_prompt, style_id, overlay_text, aspect_ratio, prompt_history_id, campaign_id, carousel_group_id, scene_order } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Domain guardrail — image generation is scoped to ministry use just like
    // the chat surfaces (see _shared/guardrails.ts and the Terms of Service).
    const verdict = prefilterPrompt(prompt + (typeof overlay_text === "string" ? `\n${overlay_text}` : ""));
    if (verdict.blocked) {
      await recordGuardrailEvent(supabase, userId, "generate-image", verdict.category);
      return new Response(JSON.stringify({ error: verdict.message, guardrail: verdict.category }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enrich the subject with curated art direction when a style is chosen.
    const style = typeof style_id === "string" ? STYLES[style_id] : undefined;
    const negatives = [GLOBAL_NEGATIVE, style?.negative, typeof negative_prompt === "string" ? negative_prompt.trim() : ""]
      .filter(Boolean)
      .join(", ");

    // Aspect presets — encoded as composition direction for the model.
    const ASPECTS: Record<string, string> = {
      square: "a perfectly square 1:1 canvas (social feed post)",
      wide: "a wide 16:9 landscape canvas (slide or header)",
      story: "a tall 9:16 portrait canvas (story or reel)",
      print: "a 3:4 portrait canvas with print-safe margins (poster or bulletin)",
    };
    const aspectNote = typeof aspect_ratio === "string" ? ASPECTS[aspect_ratio] : undefined;

    let userPrompt = prompt.trim();
    if (aspectNote) {
      userPrompt += `\n\nCompose deliberately for ${aspectNote}; keep key elements inside the safe area.`;
    }
    if (style) {
      userPrompt = `Subject: ${userPrompt}\n\nArt direction — follow faithfully: ${style.prompt}`;
      if (style.typographic && typeof overlay_text === "string" && overlay_text.trim()) {
        userPrompt += `\n\nFeatured text to render exactly, letter-perfect, as the typographic centerpiece: "${overlay_text.trim().slice(0, 220)}"`;
      } else if (typeof overlay_text === "string" && overlay_text.trim()) {
        userPrompt += `\n\nInclude this text rendered exactly and legibly within the composition: "${overlay_text.trim().slice(0, 220)}"`;
      }
    }

    const messages: { role: string; content: string }[] = [
      {
        role: "system",
        content:
          `You are a master-craft image generator for a Christian ministry design studio. ${IMAGE_DOMAIN_GUARDRAILS} ` +
          `You MUST avoid the following elements, styles, or concepts in the generated image: ${negatives}`,
      },
      { role: "user", content: userPrompt },
    ];

    // Call Lovable AI Gateway with Gemini image model
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages,
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: `Failed to generate image (gateway ${aiResponse.status})` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const imageBase64Url = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64Url) {
      console.error("generate-image: no image in gateway response", JSON.stringify(aiData).slice(0, 800));
      return new Response(JSON.stringify({ error: "The model didn't return an image. Please try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract base64 data and upload to storage
    const base64Data = imageBase64Url.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `${userId}/${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("generated-media")
      .upload(fileName, binaryData, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to save generated image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from("generated-media")
      .getPublicUrl(fileName);

    const resultUrl = publicUrlData.publicUrl;

    // Save generation record
    const insertPayload: Record<string, any> = {
      user_id: userId,
      prompt_history_id: prompt_history_id || null,
      campaign_id: campaign_id || null,
      media_type: "image",
      source_prompt: prompt,
      result_url: resultUrl,
      status: "complete",
      // Style rides in the caption field ("style:<id>") so the File Cabinet
      // can badge and filter without a schema change.
      ...(style && typeof style_id === "string" ? { caption: `style:${style_id}` } : {}),
    };
    if (carousel_group_id) insertPayload.carousel_group_id = carousel_group_id;
    if (typeof scene_order === "number") insertPayload.scene_order = scene_order;

    const { error: insertError } = await supabase.from("generations").insert(insertPayload);

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    // Bookkeeping (best-effort, never blocks the response): record the real
    // provider cost of this render to the internal-only ledger, alongside the
    // credits the user was charged. IMAGE_COST_USD is our current per-image
    // gateway rate; IMAGE_CREDITS mirrors src/lib/credit-schedule.ts.
    const IMAGE_COST_USD = 0.04;
    const IMAGE_CREDITS = 10;
    await recordInternalCost({
      userId,
      eventType: "image_generation",
      model: "google/gemini-2.5-flash-image-preview",
      rawCostUsd: IMAGE_COST_USD,
      creditsCharged: IMAGE_CREDITS,
      metadata: { style_id: style_id ?? null, aspect_ratio: aspect_ratio ?? null },
    });

    return new Response(JSON.stringify({ url: resultUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
