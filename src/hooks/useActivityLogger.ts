import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useActivityLogger = () => {
  const logActivity = useCallback(async (action: string, details?: Record<string, any>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      await supabase.functions.invoke("log-activity", {
        body: {
          action,
          details: details || null,
          userAgent: navigator.userAgent.slice(0, 255),
        },
      });
    } catch (err) {
      console.error("Activity log error:", err);
    }
  }, []);

  return { logActivity };
};
