import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ExportMessage {
  role: string;
  content: string;
  timestamp: string;
  image?: string;
}

interface ExportData {
  conversationTitle: string;
  exportedAt: string;
  messages: ExportMessage[];
}

export const useExportChat = () => {
  const exportAsJSON = useCallback(async (conversationId: string, title: string) => {
    try {
      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("role, content, created_at, image")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const exportData: ExportData = {
        conversationTitle: title,
        exportedAt: new Date().toISOString(),
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
          image: m.image || undefined,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      
      downloadFile(blob, `${sanitizeFilename(title)}.json`);
      
      toast({
        title: "Dışa aktarıldı",
        description: "Sohbet JSON olarak indirildi.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Dışa aktarma sırasında bir sorun oluştu.",
      });
    }
  }, []);

  const exportAsText = useCallback(async (conversationId: string, title: string) => {
    try {
      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      let textContent = `📝 ${title}\n`;
      textContent += `📅 Dışa aktarma: ${new Date().toLocaleString("tr-TR")}\n`;
      textContent += "─".repeat(40) + "\n\n";

      messages.forEach((m) => {
        const time = new Date(m.created_at).toLocaleString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        });
        const sender = m.role === "user" ? "👤 Sen" : "🤖 Vector";
        textContent += `[${time}] ${sender}:\n${m.content}\n\n`;
      });

      const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
      
      downloadFile(blob, `${sanitizeFilename(title)}.txt`);
      
      toast({
        title: "Dışa aktarıldı",
        description: "Sohbet metin dosyası olarak indirildi.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Dışa aktarma sırasında bir sorun oluştu.",
      });
    }
  }, []);

  return { exportAsJSON, exportAsText };
};

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
}
