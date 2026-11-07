import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Save,
  Cpu,
  RefreshCw,
  ShieldCheck,
  Star,
} from "lucide-react";

interface AIProvider {
  id: string;
  provider: string;
  label: string;
  description: string;
  is_active: boolean;
  hasKey: boolean;
}

const DEFAULT_PROVIDERS: Omit<AIProvider, "id" | "api_key" | "is_active" | "hasKey">[] = [
  {
    provider: "lovable_ai",
    label: "Lovable AI Gateway",
    description: "Dahili AI servisi (Gemini 3.8 Flash & Pro, GPT-4o)",
  },
  {
    provider: "google_ai",
    label: "Google AI (Gemini)",
    description: "Gemini 3.8 Flash, Gemini 3.8 Pro modelleri",
  },
  {
    provider: "alibaba_qwen",
    label: "Alibaba Qwen",
    description: "Qwen 3.5 Coder, Qwen 2.5 72B (Ajan Ekibi Motoru)",
  },
  {
    provider: "openai",
    label: "OpenAI",
    description: "GPT-4o, o3-mini, o1 modelleri",
  },
  {
    provider: "anthropic",
    label: "Anthropic",
    description: "Claude 3.7 Sonnet, Claude 3.5 Sonnet modelleri",
  },
  {
    provider: "groq",
    label: "Groq",
    description: "Llama 3.3 70B, Mixtral modelleri (Ultra Hızlı)",
  },
  {
    provider: "perplexity",
    label: "Perplexity",
    description: "Sonar Pro, Sonar modelleri (Gerçek Zamanlı Web Arama)",
  },
  {
    provider: "mistral",
    label: "Mistral AI",
    description: "Mistral Large 2, Codestral modelleri",
  },
  {
    provider: "cohere",
    label: "Cohere",
    description: "Command R+, Command R modelleri",
  },
];

const AIModelsTab = () => {
  const { toast } = useToast();
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedKeys, setEditedKeys] = useState<Record<string, string>>({});
  const [defaultProvider, setDefaultProvider] = useState<string>("lovable_ai");

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    const [keysRes, settingsRes] = await Promise.all([
      supabase.from("ai_api_keys").select("id, provider, is_active, updated_at"),
      supabase.from("app_settings").select("*").eq("setting_key", "default_ai_provider").maybeSingle(),
    ]);

    if (keysRes.error) {
      console.error("Error fetching AI keys:", keysRes.error);
    }

    if (settingsRes.data?.setting_value) {
      setDefaultProvider(settingsRes.data.setting_value as string);
    }

    const dbKeys = (keysRes.data || []) as { id: string; provider: string; is_active: boolean }[];
    const dbMap = new Map(dbKeys.map((k) => [k.provider, k]));

    const merged: AIProvider[] = DEFAULT_PROVIDERS.map((p) => {
      const existing = dbMap.get(p.provider);
      return {
        ...p,
        id: existing?.id || "",
        is_active: existing?.is_active ?? false,
        hasKey: !!existing,
      };
    });

    setProviders(merged);
    setEditedKeys({});
    setLoading(false);
  };

  const handleSetDefault = async (provider: string, label: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { setting_key: "default_ai_provider", setting_value: provider, updated_by: user?.id },
        { onConflict: "setting_key" }
      );

    if (error) {
      toast({ title: "Hata", description: "Varsayılan sağlayıcı ayarlanamadı.", variant: "destructive" });
      return;
    }

    setDefaultProvider(provider);
    toast({ title: "Başarılı", description: `${label} varsayılan AI sağlayıcı olarak ayarlandı.` });
  };


  const handleKeyChange = (provider: string, value: string) => {
    setEditedKeys((prev) => ({ ...prev, [provider]: value }));
  };

  const handleSaveKey = async (p: AIProvider) => {
    const newKey = editedKeys[p.provider];
    if (newKey === undefined || newKey === "") {
      toast({ title: "Hata", description: "API anahtarı boş olamaz.", variant: "destructive" });
      return;
    }

    setSaving(p.provider);

    const { data: { user } } = await supabase.auth.getUser();

    if (p.id) {
      const { error } = await supabase
        .from("ai_api_keys")
        .update({ api_key: newKey, updated_by: user?.id, updated_at: new Date().toISOString() } as never)
        .eq("id", p.id);

      if (error) {
        toast({ title: "Hata", description: "API anahtarı güncellenemedi.", variant: "destructive" });
        setSaving(null);
        return;
      }
    } else {
      const { error } = await supabase
        .from("ai_api_keys")
        .insert({ provider: p.provider, api_key: newKey, is_active: true, updated_by: user?.id } as never);

      if (error) {
        toast({ title: "Hata", description: "API anahtarı kaydedilemedi.", variant: "destructive" });
        setSaving(null);
        return;
      }
    }

    toast({ title: "Başarılı", description: `${p.label} API anahtarı kaydedildi.` });
    setSaving(null);
    await fetchKeys();
  };

  const handleToggleActive = async (p: AIProvider) => {
    if (!p.id) return;

    const { error } = await supabase
      .from("ai_api_keys")
      .update({ is_active: !p.is_active, updated_at: new Date().toISOString() } as never)
      .eq("id", p.id);

    if (error) {
      toast({ title: "Hata", description: "Durum güncellenemedi.", variant: "destructive" });
      return;
    }

    setProviders((prev) =>
      prev.map((item) =>
        item.provider === p.provider ? { ...item, is_active: !p.is_active } : item
      )
    );
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-border/30">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">AI Model API Anahtarları</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
          Yalnızca admin erişimi
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        AI modellerinin API anahtarlarını buradan yönetebilirsiniz. Anahtarlar veritabanında güvenli şekilde saklanır ve yalnızca admin tarafından görüntülenebilir.
      </p>

      <div className="space-y-4">
        {providers.map((p) => {
          const isDefault = defaultProvider === p.provider;
          return (
          <div
            key={p.provider}
            className={`rounded-xl p-4 border space-y-3 ${
              isDefault 
                ? "bg-primary/5 border-primary/30" 
                : "bg-secondary/30 border-border/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{p.label}</h3>
                  {isDefault && (
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Varsayılan
                    </Badge>
                  )}
                  {p.hasKey && (
                    <Badge
                      variant={p.is_active ? "default" : "secondary"}
                      className={p.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                    >
                      {p.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                  )}
                  {!p.hasKey && !isDefault && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Ayarlanmadı
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(p.provider, p.label)}
                    className="text-xs"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Varsayılan Yap
                  </Button>
                )}
                {p.hasKey && (
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={() => handleToggleActive(p)}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="password"
                  placeholder={p.hasKey ? "••••••••••••" : "API anahtarınızı girin..."}
                  value={editedKeys[p.provider] ?? ""}
                  onChange={(e) => handleKeyChange(p.provider, e.target.value)}
                  className="bg-background/50 font-mono text-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={() => handleSaveKey(p)}
                disabled={saving === p.provider || !editedKeys[p.provider]}
              >
                {saving === p.provider ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Kaydet
              </Button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIModelsTab;
