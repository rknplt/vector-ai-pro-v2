import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Lemon Squeezy checkout URL from env or fallback placeholder
const LEMON_SQUEEZY_CHECKOUT_URL = import.meta.env.VITE_LEMON_SQUEEZY_CHECKOUT_URL || "YOUR_LEMON_SQUEEZY_CHECKOUT_URL";

// Load Lemon Squeezy script
const loadLemonSqueezyScript = () => {
  if (document.getElementById("lemonsqueezy-js")) return;
  const script = document.createElement("script");
  script.id = "lemonsqueezy-js";
  script.src = "https://assets.lemonsqueezy.com/lemon.js";
  script.defer = true;
  document.head.appendChild(script);
};

export const useLemonSqueezy = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLemonSqueezyScript();
  }, []);

  const redirectToCheckout = async () => {
    if (!user) {
      toast({
        title: "Giriş Gerekli",
        description: "Ödeme yapmak için önce giriş yapmalısınız.",
        variant: "destructive",
      });
      return;
    }

    if (LEMON_SQUEEZY_CHECKOUT_URL === "YOUR_LEMON_SQUEEZY_CHECKOUT_URL") {
      toast({
        title: "Yapılandırma Hatası",
        description: "Ödeme sistemi henüz yapılandırılmamış.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Server-side signed token: prevents user_id tampering at checkout
      const { data, error } = await supabase.functions.invoke("create-checkout-token");
      if (error || !data?.signature) {
        toast({
          title: "Hata",
          description: "Ödeme bağlantısı oluşturulamadı. Lütfen tekrar deneyin.",
          variant: "destructive",
        });
        return;
      }

      const checkoutUrl = new URL(LEMON_SQUEEZY_CHECKOUT_URL);
      checkoutUrl.searchParams.set("checkout[custom][user_id]", data.user_id);
      checkoutUrl.searchParams.set("checkout[custom][expires_at]", String(data.expires_at));
      checkoutUrl.searchParams.set("checkout[custom][signature]", data.signature);
      if (data.email) {
        checkoutUrl.searchParams.set("checkout[email]", data.email);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LemonSqueezy = (window as any).LemonSqueezy;
      if (LemonSqueezy) {
        LemonSqueezy.Url.Open(checkoutUrl.toString());
      } else {
        window.open(checkoutUrl.toString(), "_blank");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    redirectToCheckout,
    isLoading,
    isConfigured: LEMON_SQUEEZY_CHECKOUT_URL !== "YOUR_LEMON_SQUEEZY_CHECKOUT_URL",
  };
};
