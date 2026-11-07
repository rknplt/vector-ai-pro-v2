import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
};

// Verify webhook signature from Lemon Squeezy
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  
  const signatureBytes = new Uint8Array(
    signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
  
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(payload)
  );
  
  return valid;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("x-signature");
    const webhookSecret = Deno.env.get("LEMON_SQUEEZY_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      console.error("LEMON_SQUEEZY_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.text();

    // REQUIRE signature - never process without verification
    if (!signature) {
      console.error("Missing webhook signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = await verifySignature(payload, signature, webhookSecret);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = JSON.parse(payload);
    const eventName = event.meta?.event_name;
    
    console.log("Received Lemon Squeezy event:", eventName);
    console.log("Event data:", JSON.stringify(event, null, 2));

    // Handle subscription_created or order_created events
    if (eventName === "subscription_created" || eventName === "order_created") {
      // Get signed user_id from custom data passed during checkout
      const customData = event.meta?.custom_data;
      const userId = customData?.user_id;
      const expiresAt = Number(customData?.expires_at);
      const clientSig = customData?.signature;

      if (!userId || !expiresAt || !clientSig) {
        console.error("Missing signed user_id payload in custom_data");
        return new Response(
          JSON.stringify({ error: "Missing signed user_id in custom_data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify HMAC signature (prevents tampering of user_id by the client)
      const payloadStr = `${userId}.${expiresAt}`;
      const encoder = new TextEncoder();
      const sigKey = await crypto.subtle.importKey(
        "raw", encoder.encode(webhookSecret),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      const expectedBuf = await crypto.subtle.sign("HMAC", sigKey, encoder.encode(payloadStr));
      const expectedHex = Array.from(new Uint8Array(expectedBuf))
        .map(b => b.toString(16).padStart(2, "0")).join("");
      if (expectedHex !== clientSig) {
        console.error("Invalid user_id signature in custom_data");
        return new Response(
          JSON.stringify({ error: "Invalid user_id signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Upgrading user to Plus:", userId);

      // Create Supabase client with service role
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Update user's plan to 'plus'
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          plan: "plus",
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating user plan:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update user plan" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Successfully upgraded user to Plus:", userId);

      // Log the upgrade in audit_logs (optional but recommended)
      await supabase
        .from("audit_logs")
        .insert({
          admin_id: userId, // Using user_id as the actor
          action: "plan_upgraded_via_payment",
          target_type: "profiles",
          target_id: userId,
          details: {
            event_name: eventName,
            order_id: event.data?.id,
            customer_email: event.data?.attributes?.user_email,
            plan: "plus"
          }
        });

      return new Response(
        JSON.stringify({ success: true, message: "User upgraded to Plus" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle subscription_cancelled event
    if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
      const customData = event.meta?.custom_data;
      const userId = customData?.user_id;
      
      if (userId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Downgrade user to free plan
        await supabase
          .from("profiles")
          .update({ 
            plan: "free",
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);

        console.log("User downgraded to Free:", userId);
      }
    }

    // Return success for unhandled events
    return new Response(
      JSON.stringify({ success: true, message: "Event received" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
