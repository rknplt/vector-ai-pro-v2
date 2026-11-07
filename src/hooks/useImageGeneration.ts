import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const IMAGE_GEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`;

interface GeneratedImage {
  mimeType: string;
  data: string; // base64
}

export const useImageGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImage = useCallback(async (prompt: string): Promise<{ image: GeneratedImage | null; text: string | null } | null> => {
    if (!prompt.trim()) return null;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({
        variant: "destructive",
        title: "Oturum Gerekli",
        description: "Görsel oluşturmak için giriş yapmanız gerekiyor.",
      });
      return null;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(IMAGE_GEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast({ variant: "destructive", title: "Rate Limit", description: errorData.error || "Çok fazla istek, bekleyin." });
        } else if (response.status === 402) {
          toast({ variant: "destructive", title: "Kredi Yetersiz", description: errorData.error || "Kredi limitiniz doldu." });
        } else {
          toast({ variant: "destructive", title: "Hata", description: errorData.error || "Görsel oluşturulamadı." });
        }
        return null;
      }

      const data = await response.json();
      return { image: data.image, text: data.text };
    } catch (error) {
      console.error("Image generation error:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Görsel oluşturulurken bir hata oluştu.",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generateImage, isGenerating };
};
