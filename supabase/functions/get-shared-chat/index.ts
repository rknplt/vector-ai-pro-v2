import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Token gerekli" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: share, error: shareError } = await supabaseAdmin
      .from("shared_conversations")
      .select("conversation_id")
      .eq("share_token", token)
      .single();

    if (shareError || !share) {
      return new Response(JSON.stringify({ error: "Geçersiz paylaşım linki" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("title")
      .eq("id", share.conversation_id)
      .single();

    const { data: messages, error: msgError } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content, created_at, image")
      .eq("conversation_id", share.conversation_id)
      .order("created_at", { ascending: true });

    if (msgError) {
      return new Response(JSON.stringify({ error: "Mesajlar yüklenemedi" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      title: conversation?.title || "Paylaşılan Sohbet",
      messages: messages || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("get-shared-chat error:", error);
    return new Response(JSON.stringify({ error: "Sunucu hatası" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
