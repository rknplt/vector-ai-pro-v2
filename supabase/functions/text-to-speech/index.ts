import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
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

// Input validation schema - allowed ElevenLabs voice IDs
const allowedVoiceIds = [
  "EXAVITQu4vr4xnSDxMaL", // Sarah
  "21m00Tcm4TlvDq8ikWAM", // Rachel
  "AZnzlk1XvdvUeBnXmlld", // Domi
  "D38z5RcWu1voky8WS1ja", // Fin
  "GBv7mTt0atIp3Br8iCZE", // Thomas
  "IKne3meq5aSn9XLyUdCD", // Charlie
  "LcfcDJNUP1GQjkzn1xUU", // Emily
  "MF3mGyEYCl7XYWbV9V6O", // Elli
  "N2lVS1w4EtoT3dr4eOWO", // Callum
  "TX3LPaxmHKxFdv7VOQHJ", // Liam
  "XB0fDUnXU5powFXDhCwa", // Charlotte
  "Xb7hH8MSUJpSbSDYk0k2", // Alice
  "XrExE9yKIg1WjnnlVkGX", // Matilda
  "ZQe5CZNOzWyzPSCn5a3c", // James
  "bVMeCyTHy58xNoL34h3p", // Jeremy
  "g5CIjZEefAph4nQFvHAz", // Ethan
  "jBpfuIE2acCO8z3wKNLl", // Gigi
  "jsCqWAovK2LkecY7zXl4", // Freya
  "oWAxZDx7w5VEj9dCyTzz", // Grace
  "onwK4e9ZLuTAKqWW03F9", // Daniel
  "pFZP5JQG7iQjIQuC4Bku", // Lily
  "pNInz6obpgDQGcFmaJgB", // Adam
  "z9fAnlkpzviPz146aGWa", // Glinda
  // Favori Türkçe sesler
  "LYfSi2g3Frvxg50fRl91", // Lisa (Kadın)
  "j82ax9yhzfYwq9lDvRWL", // Kadir (Erkek)
];

const voiceSettingsSchema = z.object({
  stability: z.number().min(0).max(1).optional(),
  similarity_boost: z.number().min(0).max(1).optional(),
  style: z.number().min(0).max(1).optional(),
  use_speaker_boost: z.boolean().optional(),
}).optional();

const ttsInputSchema = z.object({
  text: z.string()
    .min(1, "Text is required")
    .max(5000, "Text must be less than 5000 characters"),
  voiceId: z.string()
    .refine(val => !val || allowedVoiceIds.includes(val), {
      message: "Invalid voice ID"
    })
    .optional(),
  voiceSettings: voiceSettingsSchema,
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
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
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Geçersiz oturum" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Authenticated user:", user.id);

    // Enforce account status and feature flags
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: userSettings } = await supabaseAdmin
      .from("user_settings")
      .select("account_status, suspension_reason, feature_voice_commands")
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
      if (userSettings.feature_voice_commands === false) {
        return new Response(JSON.stringify({ error: "Sesli özellikleriniz devre dışı bırakılmıştır." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Validate input
    const rawBody = await req.json();
    const validationResult = ttsInputSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(JSON.stringify({ 
        error: "Geçersiz istek formatı",
        details: validationResult.error.errors.map(e => e.message)
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voiceId, voiceSettings } = validationResult.data;
    // Try connector key first, then fallback to manual key
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY_1") || Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    // Use a Turkish-friendly voice, default to "Lisa" if not specified
    const selectedVoiceId = voiceId || "LYfSi2g3Frvxg50fRl91";

    console.log("Generating speech for text:", text.substring(0, 50) + "...");

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: voiceSettings?.stability ?? 0.75,
            similarity_boost: voiceSettings?.similarity_boost ?? 0.70,
            style: voiceSettings?.style ?? 0.0,
            use_speaker_boost: voiceSettings?.use_speaker_boost ?? true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    console.log("Speech generated successfully");

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ error: "Ses oluşturulurken bir hata oluştu. Lütfen tekrar deneyin." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
