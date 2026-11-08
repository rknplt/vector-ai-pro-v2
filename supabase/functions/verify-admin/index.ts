import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/vector-ai-pro\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/[a-z0-9-]+\.sandbox\.lovable\.dev$/,
  /^https?:\/\/localhost(:\d+)?$/,
  /^capacitor:\/\/localhost$/,
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

// In-memory rate limiting store
// Key: IP or user identifier, Value: { count, firstRequest, blockedUntil }
const rateLimitStore = new Map<string, { count: number; firstRequest: number; blockedUntil?: number }>();

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute
const BLOCK_DURATION_MS = 5 * 60 * 1000; // Block for 5 minutes after exceeding limit

// Clean up old entries periodically (prevent memory leak)
const cleanupInterval = 10 * 60 * 1000; // Every 10 minutes
let lastCleanup = Date.now();

function cleanupRateLimitStore() {
  const now = Date.now();
  if (now - lastCleanup < cleanupInterval) return;
  
  lastCleanup = now;
  for (const [key, value] of rateLimitStore.entries()) {
    // Remove entries that are past their block period or window
    if (value.blockedUntil && value.blockedUntil < now) {
      rateLimitStore.delete(key);
    } else if (!value.blockedUntil && now - value.firstRequest > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
  console.log(`Rate limit store cleanup: ${rateLimitStore.size} entries remaining`);
}

function getRateLimitKey(req: Request, userId?: string): string {
  // Prefer user ID if available, fallback to IP
  if (userId) return `user:${userId}`;
  
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `ip:${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  cleanupRateLimitStore();
  
  const record = rateLimitStore.get(key);
  
  // Check if currently blocked
  if (record?.blockedUntil) {
    if (now < record.blockedUntil) {
      const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
      console.log(`Rate limit: ${key} is blocked for ${retryAfter}s`);
      return { allowed: false, retryAfter };
    }
    // Block period expired, reset
    rateLimitStore.delete(key);
  }
  
  if (!record || now - record.firstRequest > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitStore.set(key, { count: 1, firstRequest: now });
    return { allowed: true };
  }
  
  // Within window, increment count
  record.count++;
  
  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    // Exceeded limit, block
    record.blockedUntil = now + BLOCK_DURATION_MS;
    const retryAfter = Math.ceil(BLOCK_DURATION_MS / 1000);
    console.log(`Rate limit: ${key} exceeded limit (${record.count} requests), blocked for ${retryAfter}s`);
    return { allowed: false, retryAfter };
  }
  
  return { allowed: true };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initial rate limit check by IP (before auth)
  const ipKey = getRateLimitKey(req);
  const ipRateCheck = checkRateLimit(ipKey);
  
  if (!ipRateCheck.allowed) {
    console.log(`Rate limited by IP: ${ipKey}`);
    return new Response(
      JSON.stringify({ 
        isAdmin: false, 
        error: "Too many requests. Please try again later.",
        retryAfter: ipRateCheck.retryAfter 
      }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Retry-After": String(ipRateCheck.retryAfter)
        } 
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ isAdmin: false, error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Additional rate limit check by user ID (more precise after auth)
    const userKey = getRateLimitKey(req, user.id);
    const userRateCheck = checkRateLimit(userKey);
    
    if (!userRateCheck.allowed) {
      console.log(`Rate limited by user ID: ${userKey}`);
      return new Response(
        JSON.stringify({ 
          isAdmin: false, 
          error: "Too many requests. Please try again later.",
          retryAfter: userRateCheck.retryAfter 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(userRateCheck.retryAfter)
          } 
        }
      );
    }

    // Use service role to check admin status (bypasses RLS)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Error checking admin role:", roleError);
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Error checking role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = !!roleData;
    console.log(`Admin check for user ${user.id}: isAdmin=${isAdmin}`);

    return new Response(
      JSON.stringify({ isAdmin, userId: user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ isAdmin: false, error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
