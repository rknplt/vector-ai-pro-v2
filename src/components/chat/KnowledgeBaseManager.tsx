import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Trash2, Globe, MessageSquare, RefreshCw } from "lucide-react";

interface KBDocument {
  id: string;
  file_name: string;
  file_type: string;
  is_global: boolean;
  created_at: string;
  content: string;
}

const KnowledgeBaseManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [docs, setDocs] = useState<KBDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDocs();
  }, [user]);

  const fetchDocs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_knowledge_base")
      .select("id, file_name, file_type, is_global, created_at, content")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDocs(data as KBDocument[]);
    }
    setLoading(false);
  };

  const toggleGlobal = async (doc: KBDocument) => {
    const { error } = await supabase.functions.invoke("update-knowledge-global", {
      body: { documentId: doc.id, isGlobal: !doc.is_global },
    });

    if (error) {
      toast({ title: "Hata", description: "Belge güncellenemedi.", variant: "destructive" });
      return;
    }

    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, is_global: !d.is_global } : d));
    toast({
      title: doc.is_global ? "Sohbete Özel Yapıldı" : "Kalıcı Hafızaya Eklendi",
      description: doc.is_global
        ? `${doc.file_name} artık sadece ilgili sohbette kullanılacak.`
        : `${doc.file_name} tüm sohbetlerde hatırlanacak.`,
    });
  };

  const deleteDoc = async (id: string) => {
    const { error } = await supabase
      .from("user_knowledge_base")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Hata", description: "Belge silinemedi.", variant: "destructive" });
      return;
    }

    setDocs(prev => prev.filter(d => d.id !== id));
    toast({ title: "Silindi", description: "Belge bilgi tabanından kaldırıldı." });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {t("kb.title")} ({docs.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchDocs} title={t("kb.refresh")}>
          <RefreshCw className="w-3 h-3 mr-1" />
          {t("kb.refresh")}
        </Button>
      </div>

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("kb.empty")}
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/20">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString(language === "tr" ? "tr-TR" : "en-US")} · {Math.round(doc.content.length / 1000)}K
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={doc.is_global ? "default" : "secondary"} className="text-xs">
                  {doc.is_global ? (
                    <><Globe className="w-3 h-3 mr-1" />{t("kb.permanent")}</>
                  ) : (
                    <><MessageSquare className="w-3 h-3 mr-1" />{t("kb.chat")}</>
                  )}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => toggleGlobal(doc)} title={doc.is_global ? t("kb.makeChatSpecific") : t("kb.makeGlobal")}>
                  {doc.is_global ? <MessageSquare className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteDoc(doc.id)} className="text-destructive hover:text-destructive" title={t("common.delete")}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseManager;
