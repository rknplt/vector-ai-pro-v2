import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_MS = 25 * 60 * 1000; // Warning at 25 minutes

export const useSessionTimeout = () => {
  const { toast } = useToast();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    toast({
      title: "Oturum Sona Erdi",
      description: "Güvenliğiniz için oturumunuz otomatik olarak kapatıldı.",
      variant: "destructive",
    });
    window.location.href = "/auth";
  }, [toast]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    warningRef.current = setTimeout(() => {
      toast({
        title: "Oturum Uyarısı",
        description: "5 dakika içinde oturumunuz kapanacak. Devam etmek için bir işlem yapın.",
      });
    }, WARNING_MS);

    timeoutRef.current = setTimeout(logout, TIMEOUT_MS);
  }, [logout, toast]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];

    const handleActivity = () => resetTimer();

    // Only activate if user is logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        resetTimer();
        events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        resetTimer();
        events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningRef.current) clearTimeout(warningRef.current);
        events.forEach((e) => window.removeEventListener(e, handleActivity));
      }
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      subscription.unsubscribe();
    };
  }, [resetTimer]);
};
