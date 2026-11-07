import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/vector-ai-pro\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/[a-z0-9-]+\.sandbox\.lovable\.dev$/,
  /^http:\/\/localhost(:\d+)?$/,
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://vector-ai-pro.lovable.app",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const inputSchema = z.object({
  prompt: z.string().min(1).max(2000, "Prompt too long"),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Yetkilendirme gerekli" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Geçersiz oturum" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce account status and feature flags
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: userSettings } = await supabaseAdmin
      .from("user_settings")
      .select("account_status, suspension_reason, feature_image_generation")
      .eq("user_id", user.id)
      .single();
    if (userSettings) {
      if (userSettings.account_status === "banned") {
        return new Response(JSON.stringify({ error: "Hesabınız engellenmiştir." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (userSettings.account_status === "suspended") {
        return new Response(JSON.stringify({
          error: userSettings.suspension_reason
            ? `Hesabınız askıya alındı: ${userSettings.suspension_reason}`
            : "Hesabınız askıya alınmıştır."
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (userSettings.feature_image_generation === false) {
        return new Response(JSON.stringify({ error: "Görsel oluşturma özelliğiniz devre dışı bırakılmıştır." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const rawBody = await req.json();
    const validationResult = inputSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ error: "Geçersiz istek" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt } = validationResult.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log("Generating image for prompt:", prompt.substring(0, 50));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          { role: "system", content: "You are an image generator. Generate the image the user describes. Always respond with an image." },
          { role: "user", content: prompt },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit aşıldı, lütfen bekleyin." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredi limitiniz doldu." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Image gen error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Görsel oluşturma hatası" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("Image generation response received");

    // Extract image from response
    const choice = data.choices?.[0];
    const message = choice?.message;
    const content = message?.content;
    const images = message?.images;

    let imageData = null;
    let textContent = typeof content === 'string' ? content : null;

    // Check for images array (Lovable AI gateway format)
    if (images && Array.isArray(images) && images.length > 0) {
      const imgUrl = images[0]?.image_url?.url;
      if (imgUrl && imgUrl.startsWith('data:')) {
        // Extract mime type and base64 data from data URL
        const match = imgUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          imageData = { mimeType: match[1], data: match[2] };
        }
      }
    }

    // Fallback: Check for parts array (Gemini native format)
    if (!imageData) {
      const parts = message?.parts;
      if (parts && Array.isArray(parts)) {
        for (const part of parts) {
          if (part.inline_data) {
            imageData = {
              mimeType: part.inline_data.mime_type,
              data: part.inline_data.data,
            };
          }
          if (part.text) {
            textContent = part.text;
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      image: imageData,
      text: textContent,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return new Response(JSON.stringify({ error: "Görsel oluşturulurken bir hata oluştu. Lütfen tekrar deneyin." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
